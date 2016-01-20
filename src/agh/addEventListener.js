//%(
  /* IE のメモリリークの問題について
   *
   * | IE のメモリリークに関しては誤った認識で書いているページが沢山あるので注意する。
   * | メモリリークがどうして起こるのかを正しく理解するには GC の動作を理解する必要がある。
   * | しかし唯の Web デザイナの皆がそれを理解している訳ではないという事だろう。
   * |
   * | 結局いろいろなページを見ても、皆理由を書かずに特定の例しか挙げていないので、
   * | どの様な場合にリークが起こってどの様な場合にリークが起こらないのかが分からない。
   * | つまり、挙げられた例から少しでも構造を変えた時にどうなるのか分からない。
   * | 勝手な理由付けを行っているページも多いが、理解しかねる物が多い。
   * | 結局どのページを信用して良いのやら分からない。
   * |
   * | 結局 2ch の以下のスレッドの 702 とそれの解釈 733 が分かり易い。
   * | http://pc8.2ch.net/test/read.cgi/hp/1161422792/
   * | http://monmon.hateblo.jp/entry/20080416/1208325055
   * | 上記のスレッドではちゃんと様々な実測を試しているので信頼して良さそう。
   * |
   * | しかし他にもリークパターンが色々ある様なのでこれで解決しているのかは謎である。
   *
   * 原因と解決法における要点
   *
   *   結局 GC 境界を跨いでいる所為で循環参照を検出できないという事。
   *   (というかそもそも DOM 側は COM なので参照カウントでしか管理していない?)
   *   そして解決にはグローバルスコープに対する参照は
   *   クロージャは保持していないという事を利用できる。
   *
   * 問題
   *   以下はリークする:
   *   target.attachEvent("onclick",function(){});
   *
   *   +- managed by JS GC -+- managed by DOM GC -+
   *   |                    |                     |
   *   |         listener <-|- target             |
   *   |          ↓        |   ↑                |
   *   |      [[closure]] --|---'                 |
   *   |                    |                     |
   *   +------------------------------------------+
   *
   * 解決法1
   *
   *   以下はリークしない
   *   window.globalObject=[];
   *   window.createLeakFreeClosure=function(func){
   *     var count=globalObject.length;
   *     globalObject[count]=func;
   *     func=null;
   *     return function(){return globalObject[count].apply(this,arguments);};
   *   };
   *   (function(){
   *     target.attachEvent("onclick",createLeakFreeClosure(function(){}));
   *   })();
   *
   *   +- managed by JS GC -+- managed by DOM GC -+
   *   |                    |                     |
   *   |       dispatcher <-|- target             |
   *   |       ↓           |  ↑                 |
   *   |       [[closure]]  |  ｜                 |
   *   |       ↓           |  ｜                 |
   *   |       count        |  ｜                 |
   *   |                    |  ｜                 |
   *   |       globalObject |  ｜                 |
   *   |       ↓           |  ｜                 |
   *   |       listener   --|--'                  |
   *   |                    |                     |
   *   +--------------------+---------------------+
   *
   *   でも、うっかり [[closure]] が window への参照を持っていると台無しの気がする…。
   *   例えば
   *   (function(){
   *     window.createLeakFreeClosure=...;
   *     var hello={view:window};
   *   })();
   *
   * 解決法2
   *   window.onunload に対して detach を設定するという方法
   *
   * 実装
   *   解決法2 を用いる。
   *
   * 注意
   *   何れの場合でもページ遷移するまでは target はずっと残る。
   *   自由にクロージャを作りたければ listener → target の参照は
   *   一般的にあると仮定しなければならない。
   *   従って、切るとしたら target → listener である。
   *   この状態で target が不要になった時点で listener を削除を行うのは無理? である。
   *
   *
   * 考慮に入れていないリーク (リークの理由が不明)
   *
   * 1 inline script によるリーク
   *   http://www.javascriptkit.com/javatutors/closuresleak/
   *   このページによると document.createElement('<div onclick="foo()">'); だけでメモリリークするという…
   * 2 DOM 挿入順序によるリーク
   *   これも悩ましい。結局どの様な時にリークが起こってどの様な時に起こらないのか分からない。
   *   明言されていないが onclick='foo()' があるからリークが起こるのだろうか。
   *   それともそれとは関係なくリークが起こるのだろうか。
   *   更に、挿入順序を変えるとリークしなくなると言っているが 1 と矛盾する様な。
   * 3 文書ツリーに属していない要素にハンドラを登録する場合
   *   http://nanto.asablo.jp/blog/2005/12/04/165848
   *   1, 2 もこれが原因なのかも知れないし、これによるリーク以外にもリークがあるのかも知れない…。
   * 3 (IE8以上) 循環参照全般が駄目??
   *   http://garafu.blogspot.jp/2013/04/ie_20.html
   *   http://garafu.blogspot.jp/2013/05/ie.html
   *
   */

  // addEventListener/removeEventListener
  // function createNoLeakListener(closure){
  //   var count=agh.addEventListener.listeners.length;
  //   agh.addEventListener.listeners[closure]=closure; // グローバルにぶら下げる
  //   closure=null; // 参照の切断
  //   return function(){agh.addEventListener.listeners[count].call(this,arguments);};
  // } // どの様に remove するのが良いか?
//%)
(function(){
  // agh.addEventListener()

  // IE9 以上には addEventListener が用意されている。
  if(agh.browser.vIE<9){
    // TODO: 大量に要素を作っては削除し、を繰り返すページで致命的
    //       ページ毎ではなく要素毎に解放する様にした方が良い? (やりかた不明)

    // 以下の理由で登録されたハンドラの情報を全て記憶する必要がある
    // 1 修正した handler で addEventListener を登録する為、
    //   removeEventListener の際に対応する handler が必要になる。
    // 2 this, event.currentTarget をハンドラに渡す為
    //   IE の attachEvent では this も event.currentTarget も使えない。
    //   ※srcElement, target はイベントが発生した要素であって現在の要素ではない。
    // 3 window.onunload 時にイベントハンドラを全て detach する
    //   IE6 辺りでメモリリークがあるそうなので。

    var createIndirectHandler;
    function Thunk(target,type,listener,useCapture){
      this.target=target;
      this.type=type;
      this.listener=listener;
      this.useCapture=useCapture;

      this.id=Thunk.instanceCount++;
      this.eventName="on"+type;
      if(agh.is(this.listener,Function))
        this.invoke=this.invokeFunction;
      else if(listener!=null&&agh.is(listener.handleEvent,Function))
        this.invoke=this.invokeEventListener;
      this.handler=createIndirectHandler(this.id);
    }
    agh.memcpy(Thunk,{
      instances:[],
      instanceCount:0,
      getInstance:function(target,type,listener,useCapture){
        for(var i=0,iN=Thunk.instanceCount;i<iN;i++){
          var thunk=Thunk.instances[i];
          if(thunk
             &&target===thunk.target
             &&type===thunk.type
             &&listener===thunk.listener
             &&useCapture===thunk.useCapture)
            return thunk;
        }
        return null;
      },
      clear:function(){
        for(var i=Thunk.instanceCount-1;i>=0;i--){
          var thunk=Thunk.instances[i];
          try{if(thunk)thunk.detach();}catch(ex){}
        }
        Thunk.instanceCount=0;
        Thunk.instances.length=0;
      }
    });
    agh.memcpy(Thunk.prototype,{
      invokeFunction:function(event){
        return this.listener.call(this.target,this.createEventObject(event));
      },
      invokeEventListener:function(event){
        return this.listener.call(this.target,this.createEventObject(event));
      },
      event_preventDefault:function(){this.returnValue=false;},
      event_stopPropagation:function(){this.cancelBubble=true;},
      event_isDefaultPrevented:function(){return !this.returnValue;},
      event_isPropagationStopped:function(){return this.cancelBubble;},
      createEventObject:function(event){
        if(!event)event=window.event;

        // event.type は IE 4.0+ で存在するので代入の必要はない
        // (というか代入しようとすると IE8 で何故かエラーになる)。
        //event.type=this.type;
        event.currentTarget=this.target;
        event.target=event.srcElement;
        event.preventDefault=this.event_preventDefault;
        event.stopPropagation=this.event_stopPropagation;
        event.isDefaultPrevented=this.event_isDefaultPrevented;
        event.isPropagationStopped=this.event_isPropagationStopped;
        return event;
      },
      attach:function(){
        if(this.target.attachEvent(this.eventName,this.handler)){
          Thunk.instances[this.id]=this;
          return true;
        }else
          return false;
      },
      detach:function(){
        // MSDN には成功時に S_OK を返すと書いてあるが常に undefined しか返さない様だ…。
        var ret=this.target.detachEvent(this.eventName,this.handler);
        delete Thunk.instances[this.id];
        return true;
      }
    });

    agh.addEventListener=function addEventListener(target,type,listener,useCapture){
      // 既に登録されている場合は新しく登録しないのが addEventListener の仕様らしい
      // - ref http://www.vividcode.info/js/event/eventListener.xhtml
      // - 実際に試してみると useCapture = true/false でも区別される様だ
      var thunk=Thunk.getInstance(target,type,listener,!!useCapture);
      if(thunk)
        return true;
      else
        return new Thunk(target,type,listener,!!useCapture).attach();
    };
    agh.removeEventListener=function removeEventListener(target,type,listener,useCapture){
      var thunk=Thunk.getInstance(target,type,listener,!!useCapture);
      if(thunk)
        return thunk.detach();
      else
        return false;
    };

    // for IE6 memory leak (1): handler から closure の参照ができない様にする。
    agh.addEventListener.resource=Thunk.instances;
    createIndirectHandler=Function("id","return function(){var thunk=window.agh.addEventListener.resource[id];return thunk.invoke.apply(thunk,arguments);};");

    // for IE6 memory leak (2): window.onunload で全て detach する
    agh.addEventListener(window,"unload",function(){Thunk.clear();},false);
  }else{
    // !!useCapture とするのは useCapture を省略不可能なブラウザがある為。
    agh.addEventListener=function addEventListener(target,eventName,listener,useCapture,aWantsUntrusted){
      return target.addEventListener(eventName,listener,!!useCapture,aWantsUntrusted);
    };
    agh.removeEventListener=function removeEventListener(target,eventName,listener,useCapture,aWantsUntrusted){
      return target.removeEventListener(eventName,listener,!!useCapture,aWantsUntrusted);
    };
  }

})();
