import pytesseract
from PIL import Image
from IPython.display import display, Javascript
 
from google.colab.output import eval_js
from base64 import b64decode

# def clickPic(filename='photo.jpg', quality=0.8):
#   js = Javascript('''
#     async function clickPicJS(quality) {
#       const div = document.createElement('div');
#       const capture = document.createElement('button');
#       capture.textContent = 'Press to Capture';
#       div.appendChild(capture);

#       const video = document.createElement('video');
#       video.style.display = 'block';
#       const stream = await navigator.mediaDevices.getUserMedia({video: true});

#       document.body.appendChild(div);
#       div.appendChild(video);
#       video.srcObject = stream;
#       await video.play();

#       // Resize the output to fit the video element.
#       google.colab.output.setIframeHeight(document.documentElement.scrollHeight, true);

#       // Wait for Capture to be clicked.
#       await new Promise((resolve) => capture.onclick = resolve);

#       const canvas = document.createElement('canvas');
#       canvas.width = video.videoWidth;
#       canvas.height = video.videoHeight;
#       canvas.getContext('2d').drawImage(video, 0, 0);
#       stream.getVideoTracks()[0].stop();
#       div.remove();
#       return canvas.toDataURL('image/jpeg', quality);
#     }
#     ''')
#   display(js)
#   data = eval_js('clickPicJS({})'.format(quality))
#   binary = b64decode(data.split(',')[1])
#   with open(filename, 'wb') as f:
#     f.write(binary)
#   return filename
from IPython.display import Image as img
try:
  filename = clickPic()
  print('Saved to {}'.format(filename))
  imgpath=filename
  # Show the image which was just taken.
  display(img(filename))
except Exception as err:
  # Errors will be thrown if the user does not have a webcam or if they do not
  # grant the page permission to access it.
  print(str(err))
  from google.colab import files
uploaded = files.upload()
print(uploaded)
keys=list(uploaded.keys())
print(keys[0])
imgpath=keys[0]

print(imgpath)
readtext = pytesseract.image_to_string(Image.open(imgpath))
print(readtext)
pdf = pytesseract.image_to_pdf_or_hocr(imgpath, extension='pdf')
with open('extracteddata.pdf', 'w+b') as f:
    f.write(pdf) # pdf type is bytes by default