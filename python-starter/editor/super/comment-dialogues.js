/* Python source comments -> speaker dialogue lines.
   Pure parser: never executes code or sends it to a server.
   Supports full-line and inline # comments, and ignores # inside strings. */
(()=>{
"use strict";
function extract(source, firstLine=1, defaultLanguage="en-IN"){
  const rows=String(source||"").split(/\r?\n/);
  const items=[];
  let quote=null, triple=false;
  for(let row=0;row<rows.length;row++){
    const code=rows[row];
    let marker=-1;
    for(let i=0;i<code.length;){
      const ch=code[i];
      if(quote){
        if(ch==="\\"){i+=2;continue;}
        if(triple&&code.slice(i,i+3)===quote.repeat(3)){quote=null;triple=false;i+=3;continue;}
        if(!triple&&ch===quote){quote=null;i++;continue;}
        i++;continue;
      }
      if(ch==="#"){marker=i;break;}
      if(ch==="'"||ch==='"'){
        triple=code.slice(i,i+3)===ch.repeat(3);
        quote=ch;i+=triple?3:1;continue;
      }
      i++;
    }
    if(marker>=0){
      let text=code.slice(marker+1).trim();
      const skip=/^(?:!|-\*-\s*coding\b|coding[:=]|type:|noqa\b|pylint:|pyright:|mypy:|fmt:|ruff:|%%|region\b|endregion\b)/i;
      if(text&&!skip.test(text)){
        let mode="code",zone="left",lookAt="code";
        const directive=text.match(/^@(?:code|output|error|center|speak)\b/i);
        if(directive){
          const key=directive[0].slice(1).toLowerCase();
          if(key==="output"){mode="output";zone="right";lookAt="output";}
          else if(key==="error"){mode="error";zone="right";lookAt="error";}
          else if(key==="center"){zone="center";lookAt="audience";}
          text=text.slice(directive[0].length).replace(/^\s*[:\-–]?\s*/,"");
        }
        if(text){
          const cue=text.match(/^\[([\w-]+)(?:\|([\w-]+))?(?:\|([\w-]+))?(?:\|(soft|strong))?\]\s*/i);
          let speechCue="";
          if(cue){
            speechCue=cue[0].trim();
            text=text.slice(cue[0].length).trim();
          }
          if(text){
            const language=/[\u0900-\u097F]/.test(text)?"hi-IN":defaultLanguage;
            const emotion=mode==="error"?"concerned":items.length===0?"happy":"explaining";
            const gesture=mode==="error"?"think":mode==="output"?"point-right":zone==="center"?"welcome":items.length===0?"welcome":"point-left";
            const prefix=speechCue || "["+[emotion,gesture,language].join("|")+"]";
            items.push({
              text,script:prefix+" "+text,
              scene:{mode,zone,lookAt,sourceLine:firstLine+row},
              sourceLine:firstLine+row,inline:marker>0
            });
          }
        }
      }
    }
    if(quote&&!triple){
      // Valid single-quoted Python strings only span lines with backslash continuation.
      const tail=code.trimEnd();
      if(!tail.endsWith("\\"))quote=null;
    }
  }
  return items;
}
window.LWCPythonCommentDialogues={extract};
})();