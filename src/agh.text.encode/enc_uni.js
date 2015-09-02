// enc_uni.js
(function InitializeUnicodeEncodings(){
  /* 公開関数
   *
   *   Decoder.utf8, Encoder.utf8
   *   Decoder.utf16le, Encoder.utf16le
   *   Decoder.utf16be, Encoder.utf16be
   *   Decoder.utf32le, Encoder.utf32le
   *   Decoder.utf32be, Encoder.utf32be
   *
   *   Decoder.utf9, Encoder.utf9
   *   Decoder.utf18, Encoder.utf18
   *
   * ToDo
   *
   *   Decoder.utf-7, Encoder.utf7
   *
   */

  var UniEncBase={
    upush:function(dst,code){
      // check bom
      if(this.nobom===void 0){
        this.nobom=true;
        if(code==0xFEFF)
          return;
        if(code==0xFFFE)
          dst.push(null);
      }

      // check surrogate
      if(this.surr!==void 0){
        if((code&0xFC00)===0xDC00){
          // code = 1101:11xx:xxxx:xxxx
          dst.push(this.surr<<10|code&0x3FF);
          delete this.surr;
          return;
        }else{
          dst.push(null);
        }
        delete this.surr;
      }

      if((code&0xF800)===0xD800){
        // [1101:1yxx:xxxx:xxxx]
        if((code&0xFC00)===0xD800){
          // surrogate A [1101:10xx:xxxx:xxxx]
          this.surr=code&0x3FF;
        }else{
          // surrogate B [1101:11xx:xxxx:xxxx]
          dst.push(null);
        }
      }else{
        dst.push(code);
      }
    },
    unull:function(dst){
      this.nobom=true;
      dst.push(null);
      delete this.surr;
    },
    uterm:function(dst){
      if(this.mode!==0||this.surr!==void 0){
        dst.push(null);
        this.mode=0;
        this.code=0;
        delete this.surr;
      }
    }
  };

  Decoder.utf8=function(){
    this.mode=0;
    this.code=0;
  };
  agh.memcpy(Decoder.utf8.prototype,UniEncBase);
  agh.memcpy(Decoder.utf8.prototype,{
    decode:function(dst,src,begin,end){
      if(begin==null)begin=0;
      if(end==null)end=src.length;
      var mode=this.mode;
      var code=this.code;
      for(var i=begin;i<end;i++){
        var c=src[i]&0xFF;

        if(mode!==0&&(c&0xC0)!=0x80){
          this.unull(dst);
          mode=0;
        }

        if(c<0xF0){
          if(c<0xC0){
            if(c<0x80){
              // 0xxxxxxx [00-80]
              this.upush(dst,c);
            }else{
              // 10xxxxxx [80-C0]
              if(mode===0)
                this.unull(dst);
              else{
                code=code<<6|c&0x3F;
                if(--mode===0)
                  this.upush(dst,code);
              }
            }
          }else{
            if(c<0xE0){
              // 110xxxxx [C0-E0]
              code=c&0x1F;
              mode=1;
            }else{
              // 1110xxxx [E0-F0]
              code=c&0x0F;
              mode=2;
            }
          }
        }else{
          if(c<0xFC){
            if(c<0xF8){
              // 11110xxx [F0-F8]
              code=c&0x07;
              mode=3;
//          }else if(c<0xFC){ //■不要では?
            }else{
              // 111110xx [F8-FC]
              code=c&0x03;
              mode=4;
            }
          }else{
            if(c<0xFE){
              // 1111110x [FC-FE]
              code=c&0x01;
              mode=5;
            }else{
              // 0xFE 0xFF
              this.unull(dst);
            }
          }
        }
      }
      this.code=code;
      this.mode=mode;
    },
    terminate:function(dst){
      this.uterm(dst);
    }
  });

  // RFC4042
  Decoder.utf9=function(){
    this.mode=0;
    this.code=0;
  };
  agh.memcpy(Decoder.utf9.prototype,UniEncBase);
  agh.memcpy(Decoder.utf9.prototype,{
    decode:function(dst,src,begin,end){
      if(begin==null)begin=0;
      if(end==null)end=src.length;
      var mode=this.mode;
      var code=this.code;
      for(var i=begin;i<end;i++){
        var c=src[i];
        var b=c&0xFF;
        if((c&0x100)===0){
          this.upush(dst,code<<8|b);
          code=0;
          mode=0;
        }else{
          if(mode<3){
            code=code<<8|b;
            mode++;
          }else{
            this.unull(dst);
            code=(code<<8|b)&0xFFFFFF;
            mode=3;
          }
        }
      }
      this.mode=mode;
      this.code=code;
    },
    terminate:function(dst){
      this.uterm(dst);
    }
  });

  // RFC4042
  Decoder.utf18=function(){
    this.mode=0; // always zero (for this.uterm(dst))
  };
  agh.memcpy(Decoder.utf18.prototype,UniEncBase);
  agh.memcpy(Decoder.utf18.prototype,{
    decode:function(dst,src,begin,end){
      if(begin==null)begin=0;
      if(end==null)end=src.length;
      for(var i=begin;i<end;i++){
        var c=src[i]&0x3FFFF;
        if(c<0x30000){
          this.upush(dst,c);
        }else{
          this.upush(dst,c+0xB0000);
        }
      }
    },
    terminate:function(dst){
      this.uterm(dst);
    }
  });

  // UTF-16LE
  Decoder.utf16le=function(){
    this.mode=0;
    this.code=0;
  };
  agh.memcpy(Decoder.utf16le.prototype,UniEncBase);
  agh.memcpy(Decoder.utf16le.prototype,{
    decode:function(dst,src,begin,end){
      if(begin==null)begin=0;
      if(end==null)end=src.length;
      var mode=this.mode;
      var code=this.code;
      for(var i=begin;i<end;i++){
        var c=src[i]&0xFF;
        code|=c<<mode*8;
        if(++mode===2){
          this.upush(dst,code);
          mode=0;
          code=0;
        }
      }
      this.mode=mode;
      this.code=code;
    },
    terminate:function(dst){
      this.uterm(dst);
    }
  });

  // UTF-16BE
  Decoder.utf16be=function(){
    this.mode=0;
    this.code=0;
  };
  agh.memcpy(Decoder.utf16be.prototype,UniEncBase);
  agh.memcpy(Decoder.utf16be.prototype,{
    decode:function(dst,src,begin,end){
      if(begin==null)begin=0;
      if(end==null)end=src.length;
      var mode=this.mode;
      var code=this.code;
      for(var i=begin;i<end;i++){
        var c=src[i]&0xFF;
        code=code<<8|c;
        if(++mode===2){
          this.upush(dst,code);
          mode=0;
          code=0;
        }
      }
      this.mode=mode;
      this.code=code;
    },
    terminate:function(dst){
      this.uterm(dst);
    }
  });

  // UTF-32LE
  Decoder.utf32le=function(){
    this.mode=0;
    this.code=0;
  };
  agh.memcpy(Decoder.utf32le.prototype,UniEncBase);
  agh.memcpy(Decoder.utf32le.prototype,{
    decode:function(dst,src,begin,end){
      if(begin==null)begin=0;
      if(end==null)end=src.length;
      var mode=this.mode;
      var code=this.code;
      for(var i=begin;i<end;i++){
        var c=src[i]&0xFF;
        code|=c<<mode*8;
        if(++mode===4){
          dst.push(code);
          mode=0;
          code=0;
        }
      }
      this.mode=mode;
      this.code=code;
    },
    terminate:function(dst){
      if(this.mode!==0){
        dst.push(null);
        this.mode=0;
        this.code=0;
      }
    }
  });

  // UTF-32BE
  Decoder.utf32be=function(){
    this.mode=0;
    this.code=0;
  };
  agh.memcpy(Decoder.utf32be.prototype,UniEncBase);
  agh.memcpy(Decoder.utf32be.prototype,{
    decode:function(dst,src,begin,end){
      if(begin==null)begin=0;
      if(end==null)end=src.length;
      var mode=this.mode;
      var code=this.code;
      for(var i=begin;i<end;i++){
        var c=src[i]&0xFF;
        code=code<<8|c;
        if(++mode===4){
          this.upush(dst,code);
          mode=0;
          code=0;
        }
      }
      this.mode=mode;
      this.code=code;
    },
    terminate:function(dst){
      this.uterm(dst);
    }
  });

  Encoder.utf8=function(){};
  agh.memcpy(Encoder.utf8.prototype,{
    nocode:methods.nocode,
    encode:function(dst,src,begin,end){
      if(begin==null)begin=0;
      if(end==null)end=src.length;
      for(var i=begin;i<end;i++){
        var c=src[i]&0xFFFFFFFF;
        if(c<0x80){
          dst.push(c&0x7F);
        }else if(c<0x0800){
          dst.push(0xC0|c>>6 &0x1F);
          dst.push(0x80|c    &0x3F);
        }else if(c<0x00010000){
          dst.push(0xE0|c>>12&0x0F);
          dst.push(0x80|c>>6 &0x3F);
          dst.push(0x80|c    &0x3F);
        }else if(c<0x00200000){
          dst.push(0xF0|c>>18&0x07);
          dst.push(0x80|c>>12&0x3F);
          dst.push(0x80|c>>6 &0x3F);
          dst.push(0x80|c    &0x3F);
        }else if(c<0x04000000){
          dst.push(0xF8|c>>24&0x03);
          dst.push(0x80|c>>18&0x3F);
          dst.push(0x80|c>>12&0x3F);
          dst.push(0x80|c>>6 &0x3F);
          dst.push(0x80|c    &0x3F);
        }else if(c<0x80000000){
          dst.push(0xF8|c>>30&0x01);
          dst.push(0x80|c>>24&0x3F);
          dst.push(0x80|c>>18&0x3F);
          dst.push(0x80|c>>12&0x3F);
          dst.push(0x80|c>>6 &0x3F);
          dst.push(0x80|c    &0x3F);
        }else{
          this.nocode(dst);
        }
      }
    },
    terminate:function(dst){}
  });
  Encoder.utf9=function(){};
  agh.memcpy(Encoder.utf9.prototype,{
    nocode:methods.nocode,
    encode:function(dst,src,begin,end){
      if(begin==null)begin=0;
      if(end==null)end=src.length;
      for(var i=begin;i<end;i++){
        var c=src[i]&0xFFFFFFFF;
        if(c<0x100){
          dst.push(c);
        }else if(c<0x10000){
          dst.push(c>>8 &0xFF|0x100);
          dst.push(c    &0xFF);
        }else if(c<0x1000000){
          dst.push(c>>16&0xFF|0x100);
          dst.push(c>>8 &0xFF|0x100);
          dst.push(c    &0xFF);
        }else{
          dst.push(c>>24&0xFF|0x100);
          dst.push(c>>16&0xFF|0x100);
          dst.push(c>>8 &0xFF|0x100);
          dst.push(c    &0xFF);
        }
      }
    },
    terminate:function(dst){}
  });
  Encoder.utf18=function(){};
  agh.memcpy(Encoder.utf18.prototype,{
    nocode:methods.nocode,
    encode:function(dst,src,begin,end){
      if(begin==null)begin=0;
      if(end==null)end=src.length;
      for(var i=begin;i<end;i++){
        var c=src[i]&0x7FFFFFFF;
        if(c<0x30000){
          dst.push(c);
        }else if(0xE0000<=c&&c<0xF0000){
          dst.push(c-0xB0000&0x3FFFF);
        }else{
          this.nocode(dst);
        }
      }
    },
    terminate:function(dst){}
  });
  Encoder.utf16le=function(){};
  agh.memcpy(Encoder.utf16le.prototype,{
    nocode:methods.nocode,
    encode:function(dst,src,begin,end){
      if(begin==null)begin=0;
      if(end==null)end=src.length;
      for(var i=begin;i<end;i++){
        var c=src[i]&0xFFFFFFFF;
        if(c<0x10000){
          // if((code&0xF800)===0xD800){
          //   // shut surrogate code
          //   this.nocode(dst);
          //   continue;
          // }

          dst.push(c   &0xFF);
          dst.push(c>>8&0xFF);
        }else if(c<0x100000){
          dst.push(     c>>10&0xFF);
          dst.push(0xD8|c>>18&0x03);
          dst.push(     c    &0xFF);
          dst.push(0xDC|c>> 8&0x03);
        }else{
          this.nocode(dst);
        }
      }
    },
    terminate:function(dst){}
  });
  Encoder.utf16be=function(){};
  agh.memcpy(Encoder.utf16be.prototype,{
    nocode:methods.nocode,
    encode:function(dst,src,begin,end){
      if(begin==null)begin=0;
      if(end==null)end=src.length;
      for(var i=begin;i<end;i++){
        var c=src[i]&0xFFFFFFFF;
        if(c<0x10000){
          // if((code&0xF800)===0xD800){
          //   // shut surrogate code
          //   this.nocode(dst);
          //   continue;
          // }

          dst.push(c>>8&0xFF);
          dst.push(c   &0xFF);
        }else if(c<0x100000){
          dst.push(0xD8|c>>18&0x03);
          dst.push(     c>>10&0xFF);
          dst.push(0xDC|c>> 8&0x03);
          dst.push(     c    &0xFF);
        }else{
          this.nocode(dst);
        }
      }
    },
    terminate:function(dst){}
  });
  Encoder.utf32le=function(){};
  agh.memcpy(Encoder.utf32le.prototype,{
    nocode:methods.nocode,
    encode:function(dst,src,begin,end){
      if(begin==null)begin=0;
      if(end==null)end=src.length;
      for(var i=begin;i<end;i++){
        var c=src[i]&0xFFFFFFFF;
        dst.push(c    &0xFF);
        dst.push(c>> 8&0xFF);
        dst.push(c>>16&0xFF);
        dst.push(c>>24&0xFF);
      }
    },
    terminate:function(dst){}
  });
  Encoder.utf32be=function(){};
  agh.memcpy(Encoder.utf32be.prototype,{
    nocode:methods.nocode,
    encode:function(dst,src,begin,end){
      if(begin==null)begin=0;
      if(end==null)end=src.length;
      for(var i=begin;i<end;i++){
        var c=src[i]&0xFFFFFFFF;
        dst.push(c>>24&0xFF);
        dst.push(c>>16&0xFF);
        dst.push(c>> 8&0xFF);
        dst.push(c    &0xFF);
      }
    },
    terminate:function(dst){}
  });

})();

