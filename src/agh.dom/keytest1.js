

var keydict=[];

// 修飾キー

var VK_SHIFT  =16;
var VK_CONTROL=17;
var VK_ALTER  =18;
var VK_META   =224; // 本当か?
keydict[VK_SHIFT  ]={ch:"shift"};
keydict[VK_CONTROL]={ch:"ctrl"};
keydict[VK_ALTER  ]={ch:"alt"};
keydict[VK_META   ]={ch:"meta"};
keydict[91]={ch:"system"}; // os (windows key, apple key, etc.)

// rwin
//   Opera12 では 91:lwin, 92:rwin の区別があるが、
//   他のブラウザでは区別できない (常に 91) ので、区別しても仕方がない。
//   追記: 昔のブラウザは区別があったようだ。
keydict[92]=keydict[91];

// capslock の動きは少し注意が必要である。
//
//   まず、capslock は間違えて押して混乱する事が多い所為か、最近の Windows では
//   shift+capslock の組合せで押さないと有効にならない様になっている。
//   実際にブラウザで capslock 20 を受け取る事ができるのは shift+capslock の時である。
//   単体で capslock を押すと 240 keydown だけが送られてくる。
//   keyup も keypress も送られてこない。
//
//   また、現在の capslock の状態を知る直接的な方法は存在しない様である。
//   通常キーが押されたタイミングで shiftKey と実際の文字の対応を調べる必要がある。
//
var VK_CAPSLOCK=20;
keydict[VK_CAPSLOCK]={ch:"capslock"}; // S-capslock
// keydict[240]={ch:"capslock"};

// numlock
//   これも capslock と同様、現在の状態を知る直接的な方法はない
keydict[144]={ch:"numlock"};

keydict[ 8]={ch:"DEL"};
keydict[ 9]={ch:"TAB"};
keydict[13]={ch:"RET"};
keydict[27]={ch:"ESC"};
keydict[32]={ch:"SP" };

keydict[33]={ch:"prev"};
keydict[34]={ch:"next"};
keydict[35]={ch:"end"};
keydict[36]={ch:"home"};
keydict[37]={ch:"left"};
keydict[38]={ch:"up"};
keydict[39]={ch:"right"};
keydict[40]={ch:"down"};
keydict[45]={ch:"insert"};
keydict[46]={ch:"delete"};

for(var i=0x70;i<0x7C;i++){
  keydict[i]={ch:"f"+(i-0x70+1)};
}

// テンキー
//
//   numlock が入っていない時は、恰も普通の cursor keys が押されているかの様に振る舞う。
//   numlock が入っている場合は、「テンキーの数字」専用のコードが keyCode に入る。
//   kpent は普通の enter と全く区別が付かない。
//   S-kp5 (或いは numlock なしの真ん中) に対してもコードが送られてくる。
//   これをここでは kpbeg (keypad begin) と呼ぶ事にする。
for(var i=0x60;i<0x6A;i++)
  keydict[i]={ch:"kp"+(i-0x60+1)};
keydict[ 12]={ch:"kpbeg"};
keydict[106]={ch:"kpmul"};
keydict[107]={ch:"kpadd"};
keydict[109]={ch:"kpsub"};
keydict[110]={ch:"kpdec"};
keydict[111]={ch:"kpdiv"};

keydict[ 44]={ch:"print"}; // Print Screen (keyup しか来ない, これは Windows の仕様の様だ)
keydict[145]={ch:"scroll"}; // Scroll Lock
keydict[ 10]={ch:"pause"}; // Pause/Break

// 日本語キー
keydict[240]={ch:"capslock2"};
keydict[243]={ch:"hankaku"}; // 半角/全角 漢字 IME OFF keyup(つまりこれから on に変わろうとしている)
keydict[244]={ch:"zenkaku"}; // 半角/全角 漢字 IME ON  keyup(つまりこれから off に変わろうとしている)
keydict[229]={ch:"kanji"};   // 半角/全角 漢字 keydown
keydict[242]={ch:"kana"};    // カタカナひらがなローマ字
keydict[241]={ch:"skana"};  // shift+カタカナひらがなローマ字
keydict[ 28]={ch:"conv"};   // 変換
keydict[ 29]={ch:"noconv"}; // 無変換


keydict.layoutEnScore=0;
keydict.layoutJaScore=0;

// 数字キー
//
//   数字キーに対応する文字はキーボードの配列に依存している。
//   C-S-数字 を C-記号 に翻訳する為には事前に対応を調べておく必要がある。
//
// ※keydict[i].isShifted は S で文字自体が変わる物
for(var i=0x30;i<0x3A;i++){
  keydict[i]={
    ch:String.fromCharCode(i),
    ch_shift:null, // keydown/keypress で調べる必要がある
    ch_shift_en:")!@#$%^&*(".charAt(i-0x30),
    ch_shift_ja:" !\"#$%&'()".charAt(i-0x30),
    isShifted:true
  };
}

// アルファベット
//
for(var i=65;i<91;i++){
  keydict[i]={
    ch:String.fromCharCode(i+32),
    ch_shift:String.fromCharCode(i),
    caps:true,
    isShifted:true
  };
}

// 記号
//
//   記号のキーが一番滅茶苦茶である。ブラウザによって異なる上にキーボードによっても異なる。
//
//   とはいいつつ、最近のブラウザ (特に例外だった Opera) では概ね統一されている様だ。
//   - 多くの実装では概ね特殊なキーコードを返すようになっている。これは IE に由来し、
//     更に遡るならば Windows の VK (virtual key codes, 特に OEM 何たらの名前の物) に由来する物と思われる。
//   - それとは別に「Shift を押していない時の文字のコード」を返す様になっている実装もある。
//     古い Opera がこれに当たる様だ。自分の持っている Opera12 では既にこの振る舞いはしない様だ。
//     (特に古い Opera ではこの実装の為に cursor keys と 記号キーの区別が付かないという問題がある。)
//   - Firefox は現在でも他のブラウザと異なる値を返す様になっている。
//     一部のキー (-. :, =) については文字コードを返す。(これは [58-95] の範囲にある文字コードである。
//     58 未満の文字コードは数字キーと紛らわしいし、96以上の文字コードはテンキーと紛らわしい。
//     これらを避けた形になっていると思われる。)
//     更に別の一部のキーについては他のブラウザとは異なる特殊なコードを返す。
//   何れにしても IE の VK に収束しつつある様に思われる。
//
//   残るのはキーボードによる差異だけの様に思われる。
//   キーボードの記号の配列には二種類しかないからこれはそんなに気にする必要はないと思う。
//   二種類の配列について表を持っておいて、実際に使われる際にどちらかの判定を行えばよい。
//
function registerSymbols(dict,suffix){
  var keys=agh.ownkeys(dict);
  for(var i=0;i<keys.length;i++){
    // virtual key code
    var key=keys[i];
    var chN=dict[key].charAt(0);
    var chS=dict[key].charAt(1);
    if(!keydict[key])keydict[key]={isShifted:true};
    var ent=keydict[key];
    if(!ent.name)ent.name=chN+'/'+chS;
    ent['ch_'+suffix]=chN;
    ent['ch_shift_'+suffix]=chS;

    // // unshifted char code
    // var key=dict[key].charCodeAt(0);
    // if(58<=key&&key<96){
    //   if(!keydict[key])keydict[key]={};
    //   var ent=keydict[key];
    //   if(!ent.name)ent.name=chN+'/'+chS;
    //   ent['ch_'+suffix]=chN;
    //   ent['ch_shift_'+suffix]=chS;
    // }
  }
}

// 日本語キーボード
registerSymbols({
  186:":*" , // 日 Fx以外
  58 :":*" , // 日 Fx
  187:";+" , // 日 Fx以外
  59 :";+" , // 日 Fx
  188:",<" ,
  189:"-=" , // 日 Fx以外
  173:"-=" , // 日 Fx
  190:".>" ,
  191:"/?" ,
  192:"@`" ,
  219:"[{" ,
  220:"\\|",
  221:"]}" ,
  222:"^~" , // 日 Fx以外
  160:"^~" , // 日 Fx
  226:"\\_"  // 日 Fx以外
  // ※Fxでは \-_ のキーを押しても 220 \-| のコードが返される。
  //   (日本語キーボードには二つの \ キーがある事に注意。)
  //   つまり shift が押されている時に、それが | なのか _ なのか区別できない。
},"ja");

// 英語キーボード
registerSymbols({
  186:";:" , // 英 Fx以外
  59 :";:" , // 英 Fx
  187:"=+" , // 英 Fx以外
  61 :"=+" , // 英 Fx
  188:",<" , // 英
  189:"-_" , // 英 Fx以外
  173:"-_" , // 英 Fx
  190:".>" , // 英
  191:"/?" , // 英
  192:"`~" , // 英
  219:"[{" , // 英
  220:"\\|", // 英
  221:"]}" , // 英
  222:"'\"", // 英
  223:"`~"   // 英
},"en");
// var symbols="!\"#$%&'()-=^~\\|@`[{;+:*]},<.>/?_";


function KeyBoard(target){
  this.target=target||document;
  this.state=[];
  this.handlers={
    keydown:[],
    keypress:[],
    keyup:[]
  };
  this.capslock=false;

  agh.addEventListener(this.target,'keydown',agh.delegate(this,this.target_onkeydown));
  agh.addEventListener(this.target,'keyup',agh.delegate(this,this.target_onkeyup));
  agh.addEventListener(this.target,'keypress',agh.delegate(this,this.target_onkeypress));
}
agh.memcpy(KeyBoard.prototype,{
  isModifier:function(kcode){
    return kcode===VK_SHIFT||kcode===VK_CONTROL||kcode===VK_ALTER||kcode===VK_META;
  },
  isModified:function(){
    return this.state[VK_SHIFT]||this.state[VK_CONTROL]||this.state[VK_ALTER]||this.state[VK_META];
  },
  isNormalChar:function(kcode){
    if(this.state[VK_CONTROL]||this.state[VK_ALTER]||this.state[VK_META])return false;
    if(arguments.length===0){
      // keypress
      return true;
    }else{
      // keydown
      var ent=keydict[kcode];
      return ent&&ent.isShifted;
    }
  },
  updateState:function(e,kcode,value){
    if(value==!!this.state[kcode])return;
    this.state[kcode]=value;
    e.keyCode=kcode;
    this.callHandlers(this.handlers[value?"keydown":"keyup"],e);
  },
  updateModifierState:function(e){
    this.updateState(e,VK_SHIFT  ,e.modifiers&4||e.shiftKey);
    this.updateState(e,VK_CONTROL,e.modifiers&2||e.ctrlKey);
    this.updateState(e,VK_ALTER  ,e.modifiers&1||e.altKey);
    this.updateState(e,VK_META   ,e.metaKey);
  },
  attach:function(type,proc){
    var a=this.handlers[type];
    if(!a)return false;
    for(var i=0;i<a.length;i++)
      if(a[i]===proc)return true;
    a.push(proc);
    return true;
  },
  detach:function(type,proc){
    var a=this.handlers[type];
    if(!a)return false;
    var len=a.length;
    for(var i=0;i<len;i++){
      if(a[i]===proc){
        if(i!=len-1)a[i]=a[len-1];
        a.length=len-1;
        return true;
      }
    }
    return false;
  },
  callHandlers:function(h,e){
    var ret=true;
    for(var i=0,iN=h.length;i<iN;i++){
      try {
        if(h[i](e)===false)ret=false;
      }catch(ex){}
    }
  },
  target_onkeydown:function(e){
    var kcode=e.keyCode;
    if(kcode==229){
      // IME on の時 色々なキーが 229 に化ける
      if(!this.state[243]&&!this.state[244]){
        if(this.prevKeyUp==243)
          kcode=244;
        else if(this.prevKeyUp==244)
          kcode=243;
      }
      // ■capslock 240, 241, 242 で連動している?
      if(!this.state[241]&&!this.state[242]){
        if(this.prevKeyUp==241)
          kcode=242;
        else if(this.prevKeyUp==242)
          kcode=241;
      }
    }
    this.prevKeyUp=null;
    this.keydown_kcode=kcode;

    this.updateModifierState(e);
    this.updateState(e,kcode,true);

    if(!this.isNormalChar(kcode)){
      if(!this.isModifier(kcode)){
        // kcode2kname
        var kname="unknown";
        var shift=!!e.shiftKey;
        var ent=keydict[kcode];

        if(kcode==VK_CAPSLOCK){
          this.capslock=!this.capslock;
          shift=false;
        }

        // shift と文字の合成 @ isShifted
        if(ent){
          kname=ent.ch;

          // "!ent.caps" → C-S-a 等は shift があっても文字自体は変化しない様にする
          if(ent.isShifted&&!ent.caps){
            var prop='ch';

            // ↓C-a などのコマンドキーは capslock の影響を受けない方が良い。
            if(shift)prop='ch_shift';
            // if(shift!=(ent.caps&&this.capslock))prop='ch_shift';

            shift=false;

            if(ent[prop])
              kname=ent[prop];
            else{
              kname=ent[prop+'_ja'];
              if(!kname||ent[prop+'_en']&&keydict.layoutEnScore>keydict.layoutJaScore)
                kname=ent[prop+'_en'];
            }
          }
        }

        this.callHandlers(this.handlers["keypress"],{
          keyName:kname,
          shiftKey:shift, // 文字種に反映されている筈
          ctrlKey:e.ctrlKey,
          altKey:e.altKey,
          metaKey:e.metaKey
        });

        // for debug
        if(!(kcode==229||kcode==243||kcode==244))
          e.preventDefault(); //for debug
      }
    }
  },
  target_onkeypress:function(e){
    this.updateModifierState(e);
    if(this.isNormalChar()){
      var ch=String.fromCharCode(e.charCode);
      this.callHandlers(this.handlers["keypress"],{
        keyName:ch,
        shiftKey:false, // 文字種に反映されている筈
        ctrlKey:e.ctrlKey,
        altKey:e.altKey,
        metaKey:e.metaKey
      });

      if(this.keydown_kcode!=null){
        var ent=keydict[this.keydown_kcode];

        // update capslock state
        if(ent.caps)
          this.capslock=ch===(e.shiftKey?ent.ch:ent.ch_shift);

        // detect keyboard layout
        if(e.shiftKey){
          if(ent.ch_shift!=null){
            ent.ch_shift=ch;
            if(ent.ch_shift===ent.ch_shift_en)
              keydict.layoutEnScore++;
            if(ent.ch_shift===ent.ch_shift_ja)
              keydict.layoutJaScore++;
          }
        }else{
          if(ent.ch!=null){
            ent.ch=ch;
            if(ent.ch===ent.ch_en)
              keydict.layoutEnScore++;
            if(ent.ch===ent.ch_ja)
              keydict.layoutJaScore++;
          }
        }
        this.keydown_kcode=null;
      }
    }
  },
  target_onkeyup:function(e){
    this.updateModifierState(e);
    this.updateState(e,e.keyCode,false);

    this.prevKeyUp=e.keyCode;
  }
});

if(window.dbg){
  var css=agh.dom.stylesheet();
  css.add("span.key-panel","display:inline-block;width:30px;height:30px;text-align:center;padding:auto;border:1px solid gray;margin:2px;");
  css.add("span.key-panel-on","background-color:#efe");
  css.add("span.key-panel-off","background-color:#fee");

  var eKeyStates=[];
  function createKeyPanel(kcode,text){
    var panel=document.createElement('span');
    panel.className='key-panel key-panel-off';
    agh.dom.setInnerText(panel,text);
    eKeyStates[kcode]=panel;
    return panel;
  }

  var div0=document.createElement('div');
  agh.dom.insert(document.body,div0,'begin');
  for(var i=0;i<256;i++)
    if(keydict[i])
      div0.appendChild(createKeyPanel(i,keydict[i].ch||keydict[i].name));

  // var div0=document.createElement('div');
  // agh.dom.insert(document.body,div0,'begin');
  // for(var i=0x30;i<0x3A;i++){
  //   div0.appendChild(createKeyPanel(i,String.fromCharCode(i)));
  // }

  // var div1=document.createElement('div');
  // agh.dom.insert(div0,div1,'after');
  // for(var i=65;i<91;i++)
  //   div1.appendChild(createKeyPanel(i,String.fromCharCode(i)));

  // var div2=document.createElement('div');
  // agh.dom.insert(div1,div2,'after');
  // div2.appendChild(createKeyPanel(16,'shift'));
  // div2.appendChild(createKeyPanel(17,'ctrl'));
  // div2.appendChild(createKeyPanel(18,'alt'));
  // div2.appendChild(createKeyPanel(91,'win'));
  // div2.appendChild(createKeyPanel(92,'rwin'));

  function CharEvent(e){
    this.keyCode=e.keyCode;
    this.charCode=e.charCode;
  }

  agh.dom.insert(document.body,document.createElement("textarea"));

  var ctrlKey=createKeyPanel(1000,"C");
  var shiftKey=createKeyPanel(1001,"S");
  var altKey=createKeyPanel(1002,"A");
  var metaKey=createKeyPanel(1003,"M");
  div0.appendChild(ctrlKey);
  div0.appendChild(shiftKey);
  div0.appendChild(altKey);
  div0.appendChild(metaKey);
  function updateModifierState(e){
    agh.dom.switchClassName(shiftKey,'key-panel',e.modifiers&4||e.shiftKey?'on':'off');
    agh.dom.switchClassName(ctrlKey,'key-panel',e.modifiers&2||e.ctrlKey?'on':'off');
    agh.dom.switchClassName(altKey,'key-panel',e.modifiers&1||e.altKey?'on':'off');
    agh.dom.switchClassName(metaKey,'key-panel',e.metaKey?'on':'off');
  }

  var stat={};

  var einput=document.createElement('input');
  einput.type="text";
  agh.dom.setStyle(einput,{
    position:"absolute",
    overflow:"visible",
    width:"1px",
    height:"20px",
    backgroundColor:"#eff",
    borderStyle:"none",
    borderWidth:"0px",
    outline:"none",
    //zIndex:-999,
  });

  var eshow=document.createElement("div");
  agh.dom.setStyle(eshow,{
    height:"100px",width:"200px",
    borderWidth:"1px",borderStyle:"solid",borderColor:"black",
    backgroundColor:"white"
  });
  agh.dom.insert(document.body,eshow);
  agh.addEventListener(eshow,'click',function(){
    einput.focus();
  });

  agh.dom.insert(eshow,einput);

  var kbd=new KeyBoard(einput);
  kbd.attach('keydown',function(e){
    var panel=eKeyStates[e.keyCode];
    if(panel){
      agh.dom.switchClassName(panel,'key-panel','on');
    }else{
      div0.appendChild(createKeyPanel(kcode,kcode));
      dbg.print("{type} {keyCode} {which} {charCode}".format(e));
    }
    //e.preventDefault();
  });
  kbd.attach('keyup',function(e){
    var panel=eKeyStates[e.keyCode];
    if(panel){
      agh.dom.switchClassName(panel,'key-panel','off');
    }else
      dbg.print("{type} {keyCode} {which} {charCode}".format(e));
  });
  kbd.attach('keypress',function(e){
    var kname=e.keyName;
    if(e.shiftKey)
      kname="S-"+kname;
    if(e.ctrlKey)
      kname="C-"+kname;
    if(e.altKey||e.metaKey)
      kname="M-"+kname;
    dbg.print("key: "+kname);
    // dbg.print("{type} {keyCode} {which} {charCode}".format(e));
  });

}
