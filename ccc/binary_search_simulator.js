let bsSteps = [];
let currentStepIndex = 0;

const canvas = document.getElementById("bsCanvas");
const ctx = canvas.getContext("2d");
const arrayInput = document.getElementById("arrayInput");
const targetInput = document.getElementById("targetInput");
const visualizeBtn = document.getElementById("visualizeBtn");
const prevStepBtn = document.getElementById("prevStepBtn");
const nextStepBtn = document.getElementById("nextStepBtn");
const stepInfo = document.getElementById("stepInfo");
const stepControls = document.getElementById("stepControls");
const messageBox = document.getElementById("message");

let pulseTimer = 0;

function parseArray(input){
    const nums = input.split(/[, ]+/).map(Number).filter(n=>!isNaN(n));
    return nums.length ? nums : null;
}

function calculateSteps(arr,target){
    const steps=[];
    let low=0,high=arr.length-1,found=false;

    while(low<=high){
        const mid=Math.floor((low+high)/2);
        const step={arr:[...arr],low,mid,high,note:"",found:false};

        if(arr[mid]===target){
            step.note=`Found target ${target} at index ${mid}`;
            step.found=true;
            steps.push(step);
            found=true;
            break;
        }
        if(arr[mid]<target){
            step.note=`${arr[mid]} < ${target} → move right`;
            steps.push(step);
            low=mid+1;
        } else {
            step.note=`${arr[mid]} > ${target} → move left`;
            steps.push(step);
            high=mid-1;
        }
    }
    if(!found){
        steps.push({
            arr:[...arr],low,mid:null,high,
            note:"Target not found",notFound:true
        });
    }
    return steps;
}

function drawStep(step,target){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    if(!step)return;

    const arr = step.arr;
    const n = arr.length;
    const boxW = 70, boxH = 55;
    const gap=8;
    const startX = (canvas.width - (n*(boxW+gap)-gap))/2;
    const y = 200;

    ctx.font="20px system-ui";
    ctx.fillStyle="#000";
    ctx.textAlign="left";
    ctx.fillText(`Target = ${target}`,40,60);

    pulseTimer+=0.08;
    const pulse=Math.abs(Math.sin(pulseTimer))*0.4+0.4;

    for(let i=0;i<n;i++){
        const x = startX + i*(boxW+gap);
        let fill = "#fff";
        let strokec="#888";
        let lw=1;

        if(i===step.mid && !step.notFound){
            fill="#ffcc80";
            strokec="#bf360c";
            lw=3;
        }
        else if(!step.notFound && i>=step.low && i<=step.high){
            fill=`rgba(255,215,130,${0.3+pulse*0.3})`;
            strokec=`rgba(255,140,0,${0.4+pulse*0.4})`;
            lw = 2+pulse*2;
        }

        ctx.fillStyle=fill;
        ctx.fillRect(x,y,boxW,boxH);
        ctx.strokeStyle=strokec;
        ctx.lineWidth=lw;
        ctx.strokeRect(x,y,boxW,boxH);

        ctx.fillStyle="#000";
        ctx.textAlign="center";
        ctx.font="18px system-ui";
        ctx.fillText(arr[i], x+boxW/2, y+boxH/2);
        ctx.font="12px system-ui";
        ctx.fillText(i, x+boxW/2, y+boxH-6);

        // Arrow under mid
        if(i===step.mid){
            ctx.font="20px system-ui";
            ctx.fillStyle="#d84315";
            ctx.fillText("↓ mid", x+boxW/2, y-10);
        }
    }

    ctx.fillStyle=step.found?"#2e7d32":"#6a1b9a";
    ctx.font="18px system-ui";
    ctx.textAlign="center";
    ctx.fillText(step.note, canvas.width/2, 120);
}

function updateUI(){
    if(!bsSteps.length)return;

    stepInfo.textContent=`Step ${currentStepIndex+1}/${bsSteps.length}`;
    drawStep(bsSteps[currentStepIndex], Number(targetInput.value));
}

visualizeBtn.onclick=()=>{
    const arr=parseArray(arrayInput.value);
    if(!arr){alert("Enter sorted array");return;}

    const target=Number(targetInput.value);
    if(isNaN(target)){alert("Invalid target");return;}

    bsSteps=calculateSteps(arr,target);
    currentStepIndex=0;
    pulseTimer=0;
    stepControls.style.display="flex";
    updateUI();
};

prevStepBtn.onclick=()=>{
    if(currentStepIndex>0){
        currentStepIndex--;
        pulseTimer=0;
        updateUI();
    }
};
nextStepBtn.onclick=()=>{
    if(currentStepIndex<bsSteps.length-1){
        currentStepIndex++;
        pulseTimer=0;
        updateUI();
    }
};

drawStep(null,"?");