
// 2013-08-22 23:04:10
// padding の値を <percentage> を指定した時の挙動はどうなっているのか?

var PARE_BORDER=10;
var PARE_PADDING=15;
var PAD_PERCENT=1;

var parent=document.createElement('div');
parent.style.position='absolute';
parent.style.left='10px';
parent.style.top='10px';
parent.style.width='300px';
parent.style.height='300px';
parent.style.border=PARE_BORDER+'px solid black';
parent.style.overflow='scroll';
parent.style.backgroundColor='#efe';
parent.style.padding=PARE_PADDING+'px';
parent.style.opacity='0.5';
//parent.style.boxSizing='border-box';
document.body.appendChild(parent);

var div=document.createElement('div');
div.style.width='1px';
div.style.height='1px';
div.style.padding=PAD_PERCENT+'%';
div.style.margin='10px';
div.style.backgroundColor='#fee';
parent.appendChild(div);

log(div.offsetParent===parent);
log("parent.offsetWidth = "+parent.offsetWidth);
// log("parent.clientWidth = "+parent.clientWidth);
// log("parent.contentWidth = "+(parent.clientWidth-2*PARE_PADDING));

var actualPadding=(div.clientWidth-1)/2;
log("actual-padding = "+actualPadding);

// var ratio1=PAD_PERCENT/100;
// var ratio2=PAD_PERCENT/(100+PAD_PERCENT*2);
// log("referenceWidth1 = "+actualPadding/ratio1+"px");
// log("referenceWidth2 = "+actualPadding/ratio2+"px");

// 正しい計算式は:
var containing_block_width=parent.offsetWidth-2*PARE_BORDER-2*PARE_PADDING;
log("calculated-padding = "+containing_block_width*(PAD_PERCENT/100));
