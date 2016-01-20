// -*- mode:js -*-
// keymap.js
//
// Author: KM
//
// ChangeLog
//
// 2014-10-02 created

/*
 *
 * ブラウザ毎に系統的に keyCode を調べる方法は?
 * -後でブラウザを増やしても大丈夫な様に調べる方法を形式化しておく必要がある
 * -指定したキーを押して貰って期待した物と同じかどうかを確かめる。ずれがあればそれをプリントする。
 *
 * -キーボードのキーの状態を調べるには keydown/keyup/blur を用いる。
 * -記号類について keyCode と文字(キー名)の対応関係は keydown-keypress で調べるしかない。
 * http://www.programming-magic.com/file/20080205232140/keycode_table.html

 * -Fx: prev, next, tab: keypress で preventDefault/stopPropagation をしないと keyup が来ない
 */

(function(){
  // eventKeyCode: ブラウザのキーコード

  var eventKeyCode2kname=(function(){
    var dict={};
    for(var i=0x30;i<0x3A;i++)
      dict[i]=String.fromCharCode(i);
    for(var i=0x41;i<=0x5A;i++)
      dict[i]=String.fromCharCode(i+0x20);

    return dict;
  })()

  function getEventKeyCode(e){
    return 'keyCode' in e?e.keyCode:
      'charCode' in e?e.charCode:
      e.which;
  }

  // alphabets

  // Keymap: キー入力を受け取って登録されたコマンドに変換し実行する。
  // KeyListener: 指定した要素に対してキー入力を観察する。
  //
  // todo 同時押し

  function KeyListener(elem,keymap){
    var self=this;
    this.elem=elem;
    this.state={};
    this.kseq=[];
    agh.dom.addEventListener(elem,'keypress',function(e){
    });
    agh.dom.addEventListener(elem,'keyup',function(e){});
    agh.dom.addEventListener(elem,'keydown',function(e){
    });
    agh.dom.addEventListener(elem,'blur',function(e){
      self.clear_state();
    });
  }
  agh.memcpy(KeyListener.prototype,{
    clear_state:function(){
      for(var key in this.state)
        this.state[key]=false;
    },
    clear:function(){},
    isPressed:function(kname){
      return this.state[kname];
    }
  });

  if(window.dbg){
    // dbg.inspect(dbg);
    // dbg.inspect('agh',agh);
    dbg.log("vIE={vIE} vFx={vFx} vOp={vOp} vSf={vSf} vCr={vCr}".format(agh.browser));

    function create_checkMod(code){
      return function(eventName,e){
        if(eventName=='keypress'){
          // Opera12 では何故か rwin だけ keypress が発生する
          if(agh.browser.vOp&&code==92)
            return e.keyCode==code&&e.which==code&&e.charCode==0;
          else
            return false; // 発生しない
        }else{
          return check1(eventName,e,null,code);
        }
      };
    }

    var checkKeyCodeImpl={
      lshift:create_checkMod(16),
      rshift:create_checkMod(16),
      lctrl:create_checkMod(17),
      rctrl:create_checkMod(17),
      lalt:create_checkMod(18),
      ralt:create_checkMod(18),
      lwin:create_checkMod(91),
      rwin:create_checkMod(agh.browser.vFx?91:92),
      aa:0
    };

    function check0(e,kc,wh,cc){
      if(agh.browser.vIE<=8)
        return e.keyCode===kc&&e.which===undefined&&e.charCode===undefined;
      else
        return e.keyCode===kc&&e.which===wh&&e.charCode===cc;
    }
    function check1(eventName,e,ch,k){
      if(eventName=='keypress'){
        if(agh.browser.vFx)
          return e.keyCode==0&&e.which==ch&&e.charCode==ch;
        else
          return check0(e,ch,ch,ch);
      }else{
        return check0(e,k,k,0);
      }
    }

    // 1文字目  =shift なし
    // 2/3文字目=shift 有り
    var oemkeys={};
    if(agh.browser.vFx){
      oemkeys={
        160:"^~" ,
        173:"-=" ,
        188:",<" ,
        190:".>" ,
        191:"/?" ,
        219:"[{" ,
        220:"\\|_", // ※Win日本語Kbd には2つの \\ key がある
        221:"]}"
      };
    }else{
      oemkeys={
        186:":*" ,
        187:";+" ,
        188:",<" ,
        189:"-=" ,
        190:".>" ,
        191:"/?" ,
        192:"@`" ,
        219:"[{" ,
        220:"\\|",
        221:"]}" ,
        222:"^~" ,
        226:"\\_"
      };
      // 英語キーボードの場合
      // var oemkeys={
      //   186:";:" , // 英
      //   187:"=+" , // 英
      //   188:",<" , // 英
      //   189:"-_" , // 英
      //   190:".>" , // 英
      //   191:"/?" , // 英
      //   192:"`~" , // 英
      //   219:"[{" , // 英
      //   220:"\\|", // 英
      //   221:"]}" , // 英
      //   222:"'\"", // 英
      //   223:"`~"   // 英
      // };
    }

    function check2(kname,eventName,e,ch,k){
      if(check1(eventName,e,ch,k))return true;
      if(eventName!='keypress'){
        var k=e.keyCode;
        var o=oemkeys[k];
        if(o&&o.indexOf(kname)>=0){
          if(agh.browser.vIE<=8)
            return e.which===undefined&&e.charCode===undefined;
          else
            return e.which==k&&e.charCode==0;
        }
      }
      return false;
    }

    function CheckKeyCode(kname,eventName,e){
      if(kname==null)return false;

      if(checkKeyCodeImpl[kname])
        return checkKeyCodeImpl[kname](eventName,e);

      if(kname.length==1){
        var ch=kname.charCodeAt(0);

        if(0x30<=ch&&ch<=0x39){
          return check1(eventName,e,ch,ch);
        }else if(0x21<=ch&&ch<=0x3F){
          var k=ch;
          var n=ch&0xF;
          if(ch<0x30)k^=0x10;
          return check2(kname,eventName,e,ch,k);
        }

        if(0x40<=ch&&ch<=0x7E){
          var k=ch;
          if(0x60<=ch)k-=0x20;

          var cc=ch&0x1F;
          if(1<=cc&&cc<=26)
            return check1(eventName,e,ch,k);
          else
            return check2(kname,eventName,e,ch,k);
        }
      }
      return false;
    }

    function create_check1(code,kcode){
      return function(eventName,e){
        return check1(eventName,e,code,kcode!=null?kcode:code);
      };
    }

    function create_checkF(code){
      return function(eventName,e){
        if(eventName=='keypress')
          return check0(e,code,0,0);
        else
          return check1(eventName,e,code,code);
      };
    }

    agh.memcpy(checkKeyCodeImpl,{
      space    :create_check1(32),
      tab:create_checkF(9),
      enter:function(eventName,e){
        if(eventName=='keypress'){
          if(agh.browser.vFx)
            return check0(e,13,13,0);
          else
            return check0(e,13,13,13);
        }else
          return check1(eventName,e,13,13);
      },
      backspace:function(eventName,e){
        if(eventName=='keypress'){
          return check0(e,8,8,0);
        }else
          return check1(eventName,e,8,8);
      },
      insert  :create_checkF(45),
      'delete':create_checkF(46),
      home    :create_checkF(36),
      end     :create_checkF(35),
      prev    :create_checkF(33),
      next    :create_checkF(34),
      left    :create_checkF(37),
      up      :create_checkF(38),
      right   :create_checkF(39),
      down    :create_checkF(40),

      // これらは NumLock が入っていると異なる値になる
      kp0:create_check1(48,0x60),
      kp1:create_check1(49,0x61),
      kp2:create_check1(50,0x62),
      kp3:create_check1(51,0x63),
      kp4:create_check1(52,0x64),
      kp5:create_check1(53,0x65),
      kp6:create_check1(54,0x66),
      kp7:create_check1(55,0x67),
      kp8:create_check1(56,0x68),
      kp9:create_check1(57,0x69),

      kpadd:create_check1(0x2B,0x6B),
      kpsub:create_check1(0x2D,0x6D),
      kpmul:create_check1(0x2A,0x6A),
      kpdiv:create_check1(0x2F,0x6F),
      kpdec:create_check1(0x2E,0x6E),
      kpent:null
    });
    checkKeyCodeImpl.kpent=checkKeyCodeImpl.enter;

    function KeyCodeChecker(){
      this.document=document;

      // this.table=this.document.createElement("table");
      // this.tbody=this.document.createElement("tbody");
      // this.table.appendChild(this.tbody);
      // this.thead=this.document.createElement("tr");

      this.p=this.document.createElement("p");
      this.p.style.fontFamily='monospace,serif';
      document.body.appendChild(this.p);

      this.elem=document.createElement('textarea');
      this.elem.contentEditable=true;
      this.elem.innerHTML='hello';
      //agh.dom.setInnerText(this.elem,'hello'); // 何故か IE6 で駄目
      document.body.appendChild(this.elem);
      agh.dom.setStyle(this.elem,{
        backgroundColor:'#fee'
      });

      var self=this;
      function status(text){agh.dom.setInnerText(self.p,text);}

      function check_sequence(){
        this.index=0;
        this.mode=0;
        this.eflag=0;
        this.keys=[
          'lshift,rshift,lctrl,rctrl,lalt,ralt,lwin,rwin'.split(','),
          "qwertyuiopasdfghjklzxcvbnm0123456789".split(''),
          "!\"#$%&'()=~|`{+*}<>?_-^\\@[;:],./\\".split(''),
          'space,tab,enter,backspace,insert,delete,home,end,prev,next,left,up,right,down'.split(','),
          'kp0,kp1,kp2,kp3,kp4,kp5,kp6,kp7,kp8,kp9,kpadd,kpsub,kpmul,kpdiv,kpdec,kpent'.split(',')
          // Fx Cr IE6 IE8 Sf5.1.7(Win) Op12.19 ここまで

          // escape f1-f12 print scrlock pause capslock S-capslock numlock
        ];
      }
      agh.memcpy(check_sequence.prototype,{
        isModifierKey:function(e){
          return (e.keyCode==16||e.keyCode==17||e.keyCode==18||e.keyCode==91);
        },
        skips:function(e){
          //dbg.inspect({mode:this.mode,keyCode:e.keyCode});
          // modifier のチェックが終わったら modifier は無視
          return this.mode>0&&this.isModifierKey(e);
        },
        prevent:function(e,eventName){
          var flag=false;
          if(agh.browser.vFx){
            if(eventName=='keypress'&&(e.keyCode==9||e.keyCode==33||e.keyCode==34))flag=true;
          }else if(agh.browser.vIE){
            if(eventName=='keydown'&&(e.keyCode==9||e.keyCode==8))flag=true;
          }else{
            if(eventName=='keydown'&&(e.keyCode==9))flag=true;
          }

          // if(this.mode==0||this.mode==3){
          if(flag){
            if(e.preventDefault)e.preventDefault();
            if(e.stopPropagation)e.stopPropagation();
            if(agh.browser.vIE){
              e.cancelBubble=true;
              e.returnValue=false;
            }
            return false;
          }
        },
        next:function(){
          if(this.mode>0)
            if(this.eflag!=7)
              dbg.log(this.key()+" eflag="+this.eflag+" 発生イベントの種類が違います!");

          this.index++;
          if(this.index>=this.keys[this.mode].length){
            this.mode++;
            this.index=0;
          }
          status("next key is "+this.key());
        },
        key:function(){
          if(this.mode>=this.keys.length)return null;
          return this.keys[this.mode][this.index];
        },
        keydown:function(){
          this.eflag|=1;
          return this.key();
        },
        keypress:function(){
          this.eflag|=2;
          return this.key();
        },
        keyup:function(){
          this.eflag|=4;
          return this.key();
        }
      });
      var key=new check_sequence;
      key.mode=2;

      agh.addEventListener(this.elem,'keydown',function(e){
        if(key.skips(e))return;
        var kname=key.keydown();
        if(!CheckKeyCode(kname,'keydown',e))
          dbg.log('keydown: '+kname+' '+e.keyCode+'/'+e.which+'/'+e.charCode);
        else
          status('keydown: '+kname+' OK');

        return key.prevent(e,'keydown');
      });
      agh.addEventListener(this.elem,'keypress',function(e){
        if(key.skips(e))return;
        var kname=key.keypress();
        if(!CheckKeyCode(kname,'keypress',e))
          dbg.log('keypress: '+kname+' '+e.keyCode+'/'+e.which+'/'+e.charCode);
        else
          status('keypress: '+kname+' OK');

        return key.prevent(e,'keypress');
      });
      agh.addEventListener(this.elem,'keyup',function(e){
        if(key.skips(e))return;
        var kname=key.keyup();
        if(!CheckKeyCode(kname,'keyup',e))
          dbg.log('keyup: '+kname+' '+e.keyCode+'/'+e.which+'/'+e.charCode);
        else
          status('keyup: '+kname+' OK');

        key.next();
        return key.prevent(e,'keyup');
      });
    }

    var check=new KeyCodeChecker;
  }


})();

