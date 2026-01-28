
const saved=localStorage.getItem("theme")||"saffron";
document.getElementById("themeStylesheet").href=`assets/css/theme-${saved}.css`;
