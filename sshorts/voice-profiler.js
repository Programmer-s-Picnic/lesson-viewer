"use strict";
/* Learn Voice from Recording — local acoustic analysis.
 * No biometric identity inference or remote uploads. Pacing and prosody
 * mappings are estimates, NOT a voice clone.
 */
window.VoiceProfiler=(()=>{
  const $v=id=>document.getElementById(id);
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const round=(n,d=0)=>Number(n.toFixed(d));
  const SAMPLE_MAX=20*1024*1024, EMBED_MAX=1250000, MAX_SECONDS=90;
  const labels={classroom:"Classroom Teaching",story:"Storytelling",quiz:"Quiz Presenter"};
  const PROFILE_FORMAT="edushorts-voice-style";
  const scripts={
    classroom:"Good morning everyone. Today we will learn selection sort. First, look at these numbers. Which one is the smallest? Excellent! Remember, we swap the smallest value with the current position. Now, try the next pass yourself.",
    story:"Imagine standing in a classroom on your first day. Everything feels unfamiliar. Then, a surprising idea changes the way you think! What happens next? Let me tell you.",
    quiz:"Welcome to the quick coding challenge! Are you ready? Look carefully at this program. What output do you expect? Three, two, one. Great job! Let's explain the answer."
  };
  let recorder=null,stream=null,chunks=[],busy=false,sampleBlob=null,sampleUrl="",analysis=null,recordTimeout=0,shownProfile=null;
  const setStatus=t=>{if($v("voiceProfileStatus"))$v("voiceProfileStatus").textContent=t;};
  const log=()=>{state.voiceProfiles||=[];return state.voiceProfiles;};
  const getActive=()=>log().find(p=>p.id===state.activeVoiceProfile);
  function updateAudio(url){
    if(sampleUrl.startsWith("blob:"))URL.revokeObjectURL(sampleUrl);
    sampleUrl=url||"";
    const audio=$v("voiceReferencePlayer");
    if(audio){audio.pause();audio.src=sampleUrl;audio.load();}
  }
  function percentile(values,p){
    if(!values.length)return 0;
    const a=values.slice().sort((x,y)=>x-y),i=(a.length-1)*p,j=Math.floor(i),f=i-j;
    return a[j]*(1-f)+a[Math.min(a.length-1,j+1)]*f;
  }
  // Yin-like normalized difference on a 55ms speech window, 65–420Hz.
  // Returns 0 for unvoiced/ambiguous frames.
  function estimatePitch(channel,rate,start){
    const targetRate=11025,step=Math.max(1,Math.round(rate/targetRate)),sr=rate/step;
    const size=Math.floor(.055*sr),minLag=Math.floor(sr/420),maxLag=Math.min(Math.ceil(sr/65),size-2);
    const offset=Math.floor(start*rate);
    if(offset+size*step>=channel.length)return 0;
    const samples=new Float32Array(size);
    let mean=0;
    for(let i=0;i<size;i++){samples[i]=channel[offset+i*step];mean+=samples[i];}
    mean/=size;
    for(let i=0;i<size;i++)samples[i]-=mean;
    let power=0;for(let i=0;i<size;i++)power+=samples[i]*samples[i];
    if(power/size<.00002)return 0;
    let cumulative=0,best=0,bestScore=Infinity;
    const normalized=new Float32Array(maxLag+1);
    for(let lag=1;lag<=maxLag;lag++){
      let diff=0;
      for(let i=0;i<size-lag;i++){
        const d=samples[i]-samples[i+lag];diff+=d*d;
      }
      cumulative+=diff;
      normalized[lag]=diff*lag/Math.max(1e-12,cumulative);
      if(lag>=minLag&&normalized[lag]<bestScore){bestScore=normalized[lag];best=lag;}
    }
    // Detect the first true local minimum, not an early threshold crossing.
    let chosen=0;
    for(let lag=minLag+1;lag<maxLag;lag++){
      const a=normalized[lag-1],b=normalized[lag],d=normalized[lag+1];
      if(b<.14&&b<=a&&b<=d){chosen=lag;break;}
    }
    if(!chosen){if(bestScore>.2)return 0;chosen=best;}
    const left=normalized[chosen-1]||normalized[chosen];
    const mid=normalized[chosen],right=normalized[Math.min(maxLag,chosen+1)];
    const denom=left-2*mid+right;
    const refined=Math.abs(denom)>1e-9?clamp(.5*(left-right)/denom,-.5,.5):0;
    return sr/(chosen+refined);
  }
  function detectPauses(energy,hop,threshold){
    let start=-1,pauses=[],speaking=0,active=false;
    for(let i=0;i<energy.length;i++){
      const voiced=energy[i]>threshold;
      if(voiced){speaking+=hop;if(start>=0){const t=(i-start)*hop;if(t>=.17)pauses.push(t);start=-1;}active=true;}
      else if(active&&start<0)start=i;
    }
    return {pauses,speaking};
  }
  function measure(buffer,transcript){
    const duration=buffer.duration;
    if(duration<2||duration>MAX_SECONDS)throw Error("Please provide a 2–90 second voice sample.");
    const rate=buffer.sampleRate,channel=buffer.getChannelData(0),hop=.02,step=Math.max(1,Math.round(rate*hop));
    const energy=[];
    let sumSquare=0,samples=0;
    for(let offset=0;offset<channel.length;offset+=step){
      let sq=0,count=0;
      for(let i=offset;i<Math.min(channel.length,offset+step);i++){sq+=channel[i]*channel[i];count++;}
      const rms=Math.sqrt(sq/Math.max(1,count));energy.push(rms);
      sumSquare+=sq;samples+=count;
    }
    const overallRms=Math.sqrt(sumSquare/Math.max(1,samples));
    const peakRms=percentile(energy,.9);
    if(peakRms<.002)throw Error("Audio is too quiet to analyze.");
    const threshold=Math.max(.004,peakRms*.22);
    const {pauses,speaking}=detectPauses(energy,hop,threshold);
    const pitches=[];
    for(let time=.1;time<duration-.07;time+=.25){
      if((energy[Math.min(energy.length-1,Math.floor(time/hop))]||0)<threshold)continue;
      const f=estimatePitch(channel,rate,time);
      if(f>=65&&f<=420)pitches.push(f);
    }
    const pitchMedian=percentile(pitches,.5);
    const pitchLow=percentile(pitches,.25),pitchHigh=percentile(pitches,.75);
    const wordCount=String(transcript||"").trim().split(/\s+/).filter(Boolean).length;
    const effectiveSpeech=Math.max(.5,speaking);
    const wpm=wordCount?wordCount/effectiveSpeech*60:null;
    const avgPause=pauses.length?pauses.reduce((a,b)=>a+b,0)/pauses.length:0;
    const variationDb=peakRms>0?20*Math.log10(peakRms/Math.max(.00001,percentile(energy.filter(v=>v>threshold),.4))):0;
    const semitones=pitchLow&&pitchHigh?12*Math.log2(pitchHigh/pitchLow):null;
    return {duration:round(duration,2),meanPitchHz:pitchMedian?round(pitchMedian,1):null,
      pitchIqrHz:pitches.length>=5?round(pitchHigh-pitchLow,1):null,
      pitchIqrSemitones:semitones==null?null:round(semitones,2),
      pitchFrames:pitches.length,rms:round(overallRms,5),peakRms:round(peakRms,5),
      dynamicsDb:round(Math.max(0,variationDb),1),
      pauseCount:pauses.length,meanPauseMs:round(avgPause*1000),
      speechSeconds:round(effectiveSpeech,1),scriptWords:wordCount,
      estimatedWordsPerMinute:wpm?round(wpm):null,
      analysisMethod:"RMS threshold + YIN-like autocorrelation; transcript-based pace estimate",
      note:"Pitch, volume, emotion and rate are estimated; room acoustics, microphones and scripts affect results."};
  }
  function toSettings(metrics,kind){
    const style={classroom:"warm",story:"natural",quiz:"energetic"}[kind]||"natural";
    // Relative Web Speech controls; cannot reproduce absolute recorded F0/timbre.
    const speed=metrics.estimatedWordsPerMinute==null?100:clamp(Math.round(metrics.estimatedWordsPerMinute/145*100),78,123);
    const pitch=metrics.meanPitchHz==null?100:clamp(Math.round(100+10*Math.log2(metrics.meanPitchHz/175)),85,115);
    const variation=metrics.pitchIqrSemitones==null?30:clamp(Math.round(metrics.pitchIqrSemitones*15),12,78);
    const expression=clamp(Math.round(22+variation*.46+metrics.dynamicsDb*1.2),20,80);
    const pauses=metrics.meanPauseMs?clamp(Math.round((metrics.meanPauseMs-140)/3.1),20,95):45;
    return {style,smart:true,pitch,speed,variation,expression,pauses,volume:92};
  }
  async function analyze(blob){
    if(!blob||blob.size===0)throw Error("Select or record a voice sample first.");
    if(blob.size>SAMPLE_MAX)throw Error("Audio exceeds 20 MB; use a shorter sample.");
    if(busy)return;
    busy=true;analysis=null;$v("voiceProfileSaveBtn").disabled=true;$v("voiceProfileAnalyzeBtn").disabled=true;
    try{
      const AC=window.AudioContext||window.webkitAudioContext;
      if(!AC)throw Error("Web Audio is not supported in this browser.");
      const context=new AC();
      let buffer;
      try{buffer=await context.decodeAudioData(await blob.arrayBuffer());}
      finally{await context.close().catch(()=>{});}
      const kind=$v("voiceProfileKind").value;
      const script=$v("voiceProfileScript").value.trim();
      if(!script)throw Error("Enter the words you read to estimate speaking speed.");
      const metrics=measure(buffer,script);
      analysis={kind,script,metrics,settings:toSettings(metrics,kind)};
      sampleBlob=blob;
      // Apply as an editable working setting immediately. Save Profile makes
      // a reusable named entry in the project JSON.
      state.voiceStudio={...VoiceDirector.defaults,...(state.voiceStudio||{}),...analysis.settings};
      VoiceDirector.syncControls();
      saveLocal();
      $v("voiceProfileMetrics").textContent=[
        "Duration: "+metrics.duration+" s",
        "Measured pitch: "+(metrics.meanPitchHz==null?"Unavailable":metrics.meanPitchHz+" Hz"),
        "Pitch variation: "+(metrics.pitchIqrSemitones==null?"Unavailable":metrics.pitchIqrSemitones+" semitones (IQR)"),
        "Pauses: "+metrics.pauseCount+"; average "+metrics.meanPauseMs+" ms",
        "Estimated rate: "+metrics.estimatedWordsPerMinute+" words/min (based on supplied script)",
        "RMS signal level: "+metrics.rms+"; energy dynamics: "+metrics.dynamicsDb+" dB"
      ].join("\n");
      $v("voiceProfileSaveBtn").disabled=false;
      refresh();
      setStatus("Analysis complete. The estimated settings are active. Save the profile to reuse it.");
    }finally{busy=false;$v("voiceProfileAnalyzeBtn").disabled=false;}
  }
  async function asDataUrl(blob){
    return new Promise((resolve,reject)=>{
      const reader=new FileReader();
      reader.onload=()=>resolve(String(reader.result));
      reader.onerror=()=>reject(Error("Could not embed recording."));
      reader.readAsDataURL(blob);
    });
  }
  async function saveProfile(){
    if(!analysis||!sampleBlob)return setStatus("Analyze a recording before saving a profile.");
    const kind=analysis.kind;
    const profiles=log();
    const old=profiles.find(p=>p.kind===kind);
    const keepAudio=$v("voiceProfileEmbedAudio").checked&&sampleBlob.size<=EMBED_MAX;
    if($v("voiceProfileEmbedAudio").checked&&sampleBlob.size>EMBED_MAX)
      setStatus("Recording exceeds 1.25 MB, so only settings will be saved. Reduce recording size to embed audio.");
    const audioData=keepAudio?await asDataUrl(sampleBlob):"";
    const profile={
      id:old?.id||crypto.randomUUID(),kind,name:labels[kind],createdAt:new Date().toISOString(),
      script:analysis.script,metrics:analysis.metrics,settings:{...VoiceDirector.config(),...analysis.settings},
      baseVoiceName:$v("ttsNarrationVoice")?.value||"",baseRate:Number($v("ttsNarrationRate")?.value||1),
      referenceAudio:audioData,referenceMime:audioData?(sampleBlob.type||"audio/webm"):"",
      schemaVersion:1
    };
    if(old)profiles.splice(profiles.indexOf(old),1,profile);
    else profiles.push(profile);
    state.activeVoiceProfile=profile.id;
    // Keep the just-recorded local sample playable even when its size
    // exceeds the optional JSON embedding limit.
    shownProfile=profile;
    saveLocal();refresh();
    setStatus("Saved "+profile.name+" with measurements and settings"+(keepAudio?" and reference audio.":". Reference audio not embedded."));
  }
  function refresh(){
    const select=$v("voiceProfileSaved");if(!select)return;
    const selected=state.activeVoiceProfile||"";
    select.replaceChildren();
    const empty=document.createElement("option");empty.value="";empty.textContent="Choose saved voice profile";select.append(empty);
    for(const p of log()){
      const opt=document.createElement("option");opt.value=p.id;opt.textContent=p.name;select.append(opt);
    }
    select.value=log().some(p=>p.id===selected)?selected:"";
    const profile=getActive()||null;
    if(profile!==shownProfile){
      shownProfile=profile||null;
      analysis=null;sampleBlob=null;
      $v("voiceProfileSaveBtn").disabled=true;
      if(profile){
        $v("voiceProfileKind").value=profile.kind;
        $v("voiceProfileScript").value=profile.script||scripts[profile.kind];
        updateAudio(profile.referenceAudio||"");
      }else{
        updateAudio("");
        $v("voiceProfileMetrics").textContent="";
      }
    }
    $v("voiceProfileUpdateBtn").disabled=!profile;
    $v("voiceProfileExportBtn").disabled=!profile;
    $v("voiceProfileUseStyleBtn").disabled=!profile;
    const audioAvailable=!!sampleBlob||!!profile?.referenceAudio;
    $v("voiceProfileDownloadAudioBtn").disabled=!audioAvailable;
    $v("voiceProfileUseAudioBtn").disabled=!audioAvailable||!current();
    if(profile&&!analysis){
      $v("voiceProfileMetrics").textContent=
        "Saved "+profile.name+" — "+profile.metrics.duration+" s, pitch "+
        (profile.metrics.meanPitchHz??"N/A")+" Hz, speed "+
        (profile.metrics.estimatedWordsPerMinute??"N/A")+" WPM";
    }
  }
  function loadProfile(id){
    const profile=log().find(p=>p.id===id);
    if(!profile)return;
    state.activeVoiceProfile=id;
    state.voiceStudio={...VoiceDirector.defaults,...(state.voiceStudio||{}),...profile.settings};
    if(profile.baseVoiceName){
      const select=$v("ttsNarrationVoice");
      if([...select.options].some(opt=>opt.value===profile.baseVoiceName)){
        select.value=profile.baseVoiceName;state.ttsVoiceName=profile.baseVoiceName;
      }
    }
    if(Number.isFinite(Number(profile.baseRate))&&Number(profile.baseRate)>0){
      const rate=clamp(Number(profile.baseRate),.6,1.5);
      $v("ttsNarrationRate").value=rate;state.ttsNarrationRate=rate;
      $v("ttsNarrationRateOut").value=rate.toFixed(1).replace(".0","")+"×";
    }
    $v("voiceProfileKind").value=profile.kind;
    $v("voiceProfileScript").value=profile.script||scripts[profile.kind];
    analysis=null;sampleBlob=null;
    $v("voiceProfileSaveBtn").disabled=true;
    updateAudio(profile.referenceAudio||"");
    VoiceDirector.syncControls();saveLocal();refresh();
    setStatus("Applied "+profile.name+(profile.referenceAudio?". Compare with its reference audio.":". Original audio was not embedded."));
  }
  function updateProfile(){
    const profile=getActive();
    if(!profile)return setStatus("Choose a saved voice profile before updating settings.");
    const currentSettings={...VoiceDirector.config()};
    const keys=["style","smart","pitch","volume","speed","expression","variation","pauses","dictionary"];
    profile.settings={...profile.settings,...Object.fromEntries(keys.map(key=>[key,currentSettings[key]]))};
    profile.baseVoiceName=$v("ttsNarrationVoice")?.value||"";
    profile.baseRate=Number($v("ttsNarrationRate")?.value||1);
    profile.modifiedAt=new Date().toISOString();
    saveLocal();refresh();
    setStatus("Saved manual adjustments to "+profile.name+". Original measured characteristics are preserved.");
  }
  // Download a recording as audio, independently of the optional
  // embedded copy in a project or voice-style JSON file.
  function saveRecording(){
    const profile=getActive();
    const source=sampleBlob||profile?.referenceAudio;
    if(!source)return setStatus("Record a voice sample or select a saved profile with embedded audio.");
    const mime=sampleBlob?.type||profile?.referenceMime||"audio/webm";
    const ext=/mp4|aac/.test(mime)?"m4a":/wav/.test(mime)?"wav":/mpeg|mp3/.test(mime)?"mp3":/ogg/.test(mime)?"ogg":"webm";
    const name=(profile?.kind||$v("voiceProfileKind").value||"voice")+"-reference-"+Date.now()+"."+ext;
    const a=document.createElement("a");
    const temporary=typeof source!=="string";
    const url=temporary?URL.createObjectURL(source):source;
    a.href=url;a.download=name;a.style.display="none";
    document.body.append(a);
    a.click();
    a.remove();
    if(temporary)setTimeout(()=>URL.revokeObjectURL(url),30000);
    setStatus("Recording download started: "+name+". This is the original sound, not synthesized audio.");
  }
  async function useRecordingOnSlide(){
    const slide=current();
    if(!slide)return setStatus("Add or select a slide first.");
    const profile=getActive();
    const source=sampleBlob||profile?.referenceAudio;
    if(!source)return setStatus("Record or load an embedded voice sample first.");
    if(sampleBlob?.size>8*1024*1024)
      return setStatus("Recording is over 8 MB. Please attach it through Upload narration rather than embedding it here.");
    if(!confirm("Use the exact recorded voice on this slide? Its words will not be generated from the slide text, and existing slide narration will be replaced."))return;
    const transcript=$v("voiceProfileScript").value.trim()||profile?.script||"";
    const audio=typeof source==="string"?source:await asDataUrl(source);
    slide.narrationText=transcript;
    await attachNarration(audio,profile?.name||"Recorded reference voice",{kind:"recorded"});
    setStatus("Original voice recording attached to this slide. The narration text now matches its transcript.");
    refresh();
  }
  function useStyle(){
    const chosen=$v("voiceProfileSaved").value||state.activeVoiceProfile;
    const profile=log().find(p=>p.id===chosen);
    if(!profile)return setStatus("Select or save a voice profile first.");
    loadProfile(profile.id);
    if(current()?.narrationAudio){
      setStatus("Saved style applied to new synthetic speech. This slide already has attached audio; remove the existing narration to hear regenerated speech.");
    }else{
      setStatus(profile.name+" applied to synthetic narration. Enter narration and click Test speech; this style also applies to automatic TTS export.");
    }
  }
  function saveStyleFile(){
    const profile=getActive();
    if(!profile)return setStatus("Select a saved voice profile first.");
    const data={
      format:PROFILE_FORMAT,version:1,exportedAt:new Date().toISOString(),
      profile:{
        kind:profile.kind,name:profile.name,
        script:profile.script,metrics:profile.metrics,
        settings:profile.settings,
        baseVoiceName:profile.baseVoiceName||"",
        baseRate:profile.baseRate||1
      }
    };
    download(new Blob([JSON.stringify(data,null,2)],{type:"application/json"}),
      (profile.kind||"voice")+"-style.json");
    setStatus("Voice settings downloaded. This file contains settings and measurements, not your original audio.");
  }
  function importSettings(file){
    return file.text().then(text=>{
      if(file.size>100000)throw Error("Voice settings JSON must be smaller than 100 KB.");
      const data=JSON.parse(text);
      if(data.format!==PROFILE_FORMAT||data.version!==1||!data.profile)
        throw Error("Not a supported EduShorts voice-style JSON.");
      const src=data.profile;
      if(!Object.prototype.hasOwnProperty.call(labels,src.kind))throw Error("Unknown voice profile type.");
      if(!src.settings||typeof src.settings!=="object"||Array.isArray(src.settings))throw Error("Profile settings are missing.");
      const defaults=VoiceDirector.defaults;
      const safeSettings={...defaults};
      for(const [key,min,max] of [["pitch",80,120],["volume",50,100],["speed",70,130],["expression",0,100],["variation",0,100],["pauses",0,100]]){
        const n=Number(src.settings[key]);
        if(Number.isFinite(n))safeSettings[key]=clamp(n,min,max);
      }
      if(["natural","warm","energetic","calm"].includes(src.settings.style))safeSettings.style=src.settings.style;
      if(typeof src.settings.smart==="boolean")safeSettings.smart=src.settings.smart;
      if(typeof src.settings.dictionary==="string")safeSettings.dictionary=src.settings.dictionary.slice(0,5000);
      const existing=log().find(p=>p.kind===src.kind);
      if(existing&&!confirm("Replace the existing "+labels[src.kind]+" profile with this imported voice style?"))return;
      const numericMetrics={};
      for(const key of ["duration","meanPitchHz","pitchIqrHz","pitchIqrSemitones","pitchFrames","rms","peakRms","dynamicsDb","pauseCount","meanPauseMs","speechSeconds","scriptWords","estimatedWordsPerMinute"]){
        const n=Number(src.metrics?.[key]);
        numericMetrics[key]=src.metrics?.[key]===null||src.metrics?.[key]===undefined||!Number.isFinite(n)?null:n;
      }
      const profile={
        id:existing?.id||crypto.randomUUID(),kind:src.kind,name:labels[src.kind],
        createdAt:new Date().toISOString(),script:String(src.script||"").slice(0,5000),
        metrics:numericMetrics,settings:safeSettings,
        baseVoiceName:String(src.baseVoiceName||"").slice(0,100),
        baseRate:clamp(Number(src.baseRate)||1,.6,1.5),
        referenceAudio:"",referenceMime:"",schemaVersion:1
      };
      if(existing)log().splice(log().indexOf(existing),1,profile);else log().push(profile);
      state.activeVoiceProfile=profile.id;
      analysis=null;sampleBlob=null;shownProfile=null;
      loadProfile(profile.id);
      setStatus(profile.name+" voice settings imported and applied. New synthesized narration will use this speaking style.");
    });
  }

  function deleteProfile(){
    const id=$v("voiceProfileSaved").value;
    if(!id)return;
    const p=log().find(x=>x.id===id);if(!p)return;
    if(!confirm("Delete the saved "+p.name+" profile from this project?"))return;
    state.voiceProfiles=log().filter(x=>x.id!==id);
    if(state.activeVoiceProfile===id)state.activeVoiceProfile="";
    analysis=null;sampleBlob=null;updateAudio("");saveLocal();refresh();
    $v("voiceProfileMetrics").textContent="";setStatus("Saved profile deleted.");
  }
  async function startRecording(){
    if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder)
      throw Error("Microphone recording requires a supported browser and HTTPS.");
    stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:false}});
    const mime=["audio/webm;codecs=opus","audio/webm","audio/mp4"].find(x=>MediaRecorder.isTypeSupported(x));
    recorder=mime?new MediaRecorder(stream,{mimeType:mime,audioBitsPerSecond:32000}):new MediaRecorder(stream);
    chunks=[];
    recorder.ondataavailable=e=>{if(e.data?.size)chunks.push(e.data);};
    recorder.onstop=async()=>{
      clearTimeout(recordTimeout);recordTimeout=0;
      const blob=new Blob(chunks,{type:recorder.mimeType||"audio/webm"});
      stream?.getTracks().forEach(track=>track.stop());stream=null;recorder=null;
      $v("voiceProfileRecordBtn").textContent="Start voice recording";
      try{sampleBlob=blob;updateAudio(URL.createObjectURL(blob));refresh();await analyze(blob);}
      catch(error){setStatus("Analysis failed: "+error.message);}
    };
    recorder.start(200);
    recordTimeout=setTimeout(()=>{if(recorder?.state==="recording")recorder.stop();},MAX_SECONDS*1000);
    $v("voiceProfileRecordBtn").textContent="Stop & analyze";
    setStatus("Recording. Read the displayed script naturally, then stop.");
  }
  function compareSynthesized(){
    const profile=getActive();
    const script=$v("voiceProfileScript").value.trim()||profile?.script||"";
    if(!script)return setStatus("Enter the reference script first.");
    $v("voiceReferencePlayer").pause();
    const ctrl=speakText(script,$v("ttsNarrationVoice")?.value||"",Number($v("ttsNarrationRate")?.value)||1);
    if(!ctrl)return setStatus("No browser speech voice available.");
    setStatus("Playing synthesized sample with the current profile settings.");
    ctrl.onend=()=>setStatus("Synthesized comparison finished.");
    ctrl.onerror=e=>setStatus("Synthesized comparison error: "+(e?.error||"unknown error"));
  }
  function init(){
    if(!$v("voiceProfileRecordBtn"))return;
    $v("voiceProfileScript").value=scripts.classroom;
    $v("voiceProfileScript").addEventListener("input",()=>{
      if(analysis){analysis=null;$v("voiceProfileSaveBtn").disabled=true;
        setStatus("Script changed. Choose Analyze again to recalculate speaking speed.");}
    });
    $v("voiceProfileKind").onchange=()=>{
      $v("voiceProfileScript").value=scripts[$v("voiceProfileKind").value]||scripts.classroom;
      analysis=null;$v("voiceProfileSaveBtn").disabled=true;
    };
    $v("voiceProfileRecordBtn").onclick=async()=>{
      if(recorder&&recorder.state!=="inactive"){recorder.stop();return;}
      try{await startRecording();}catch(error){stream?.getTracks().forEach(t=>t.stop());setStatus(error.message);}
    };
    $v("voiceProfileInput").onchange=async e=>{
      const file=e.target.files?.[0];e.target.value="";
      if(!file)return;
      try{
        if(file.size>SAMPLE_MAX)throw Error("Audio exceeds 20 MB.");
        sampleBlob=file;updateAudio(URL.createObjectURL(file));refresh();await analyze(file);
      }catch(error){setStatus(error.message);}
    };
    $v("voiceProfileAnalyzeBtn").onclick=async()=>{
      try{await analyze(sampleBlob);}catch(error){setStatus(error.message);}
    };
    $v("voiceProfileSaveBtn").onclick=()=>saveProfile().catch(e=>setStatus("Save failed: "+e.message));
    $v("voiceProfileSaved").onchange=e=>loadProfile(e.target.value);
    $v("voiceProfileUpdateBtn").onclick=updateProfile;
    $v("voiceProfileDeleteBtn").onclick=deleteProfile;
    $v("voiceProfileCompareBtn").onclick=compareSynthesized;
    $v("voiceProfileUseStyleBtn").onclick=useStyle;
    $v("voiceProfileDownloadAudioBtn").onclick=saveRecording;
    $v("voiceProfileUseAudioBtn").onclick=()=>useRecordingOnSlide().catch(e=>setStatus("Could not attach recording: "+e.message));
    $v("voiceProfileExportBtn").onclick=saveStyleFile;
    $v("voiceProfileImportInput").onchange=async e=>{
      const file=e.target.files?.[0];e.target.value="";
      if(!file)return;
      try{await importSettings(file);}catch(error){setStatus("Could not import voice settings: "+error.message);}
    };
    const oldLoadEditor=loadEditor;
    loadEditor=function(){oldLoadEditor();refresh();};
    const originalNew=$v("newBtn").onclick;
    $v("newBtn").onclick=()=>{
      const before=state;
      originalNew();
      if(state===before)return;
      analysis=null;sampleBlob=null;
      updateAudio("");
      $v("voiceProfileMetrics").textContent="";
      $v("voiceProfileSaveBtn").disabled=true;
      refresh();
    };
    refresh();
  }
  window.addEventListener("beforeunload",()=>{
    clearTimeout(recordTimeout);
    if(recorder?.state==="recording")recorder.stop();
    stream?.getTracks().forEach(t=>t.stop());
    if(sampleUrl.startsWith("blob:"))URL.revokeObjectURL(sampleUrl);
  });
  return {init,measure,toSettings,estimatePitch,refresh,loadProfile};
})();
window.VoiceProfiler.init();
