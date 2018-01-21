(function(){
//#gzjs-tokenmap(out,         A)
//#gzjs-tokenmap(next,        B)
//#gzjs-tokenmap(str,         C)
//#gzjs-tokenmap(len,         D)
//#gzjs-tokenmap(i2b,         E)
//#gzjs-tokenmap(b2i,         F)
//#gzjs-tokenmap(TBL_I2B,     G)
//#gzjs-tokenmap(TBL_B2I,     H)
//#gzjs-tokenmap(inflate_a2a, I)
//#gzjs-tokenmap(decode85_s2a,J)
//#gzjs-tokenmap(utf8to16_a2s,K)
//%include impl_inflate.js
//%include impl_a85.js
//%include impl_utf8.js
  return function(s){
    return utf8to16_a2s(inflate_a2a(decode85_s2a(s)));
  };
})();
