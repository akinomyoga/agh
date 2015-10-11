#include <cstdio>
#include <cstdlib>
#include <mwg/except.h>
#include <mwg/bio/tape.h>

void usage(int ext=0){
  std::fprintf(ext?stderr:stdout,"usage: gzcut gzfile\n\n");
  std::exit(ext);
}

void eexit(const char* message){
  std::fprintf(stderr,"%s\n",message);
  std::exit(1);
}

class a85encoder{
  std::FILE* file;
  int count;
  mwg::u4t value;
  int maxcols;
  int col;
public:
  a85encoder(std::FILE* file):file(file){
    count=0;
    value=0;
    maxcols=128;
    col=0;
  }
private:
  void qbeg(){
    putc('"',file);
  }
  void qend(){
    putc('"',file);
    putc(',',file);
    putc('\n',file);
    col=0;
  }
  void putc_a85(mwg::u4t v){
    if(maxcols>0&&col==0)qbeg();

    v%=85;
    if(v==52)v=85;
    putc(40+v,file);

    if(maxcols>0&&++col==maxcols)qend();
  }
  void dump(){
    if(count){
      for(;count;count--){
        putc_a85(value);
        value/=85;
      }
      putc_a85(value);
      value=0;
    }
  }
public:
  void consume(mwg::byte b){
    value|=b<<8*count++;
    if(count==4)dump();
  }
  void terminate(){
    dump();
    if(maxcols>0&&col!=0)qend();
  }
  ~a85encoder(){terminate();}
};


int main(int argc,char** argv){
  const char* fname;
  if(argc==2)
    fname=argv[1];
  else if(argc==1)
    fname="/dev/stdout";
  else
    usage(1);

  mwg::bio::ftape tape(fname,"rb");
  if(!tape){
    std::fprintf(stderr,"failed to open the file %s.\n",fname);
    usage(1);
  }

  mwg::bio::tape_head<mwg::bio::ftape,mwg::bio::little_endian_flag> head(tape);

  struct gzip_member_header{
    mwg::byte id1;
    mwg::byte id2;
    mwg::byte cm;
    mwg::byte flg;
    mwg::u4t  mtime;
    mwg::byte xfl;
    mwg::byte os;
  } header={0};

  head.read(header.id1  );
  head.read(header.id2  );
  head.read(header.cm   );
  head.read(header.flg  );
  head.read(header.mtime);
  head.read(header.xfl  );
  head.read(header.os   );

  //mwg_assert(c1==31&&c2==139,"c1=%02x c2=%02x",c1,c2);
  if(!(header.id1==31&&header.id2==139)){
    std::fprintf(stderr,"gzcut: invalid ID1/ID2 %d/%d\n",header.id1,header.id2);
    std::exit(1);
  }
  if(header.cm!=8){
    std::fprintf(stderr,"gzcut: unrecognized compression method %d\n",header.cm);
    std::exit(1);
  }
  if(header.flg&0xE0){
    std::fprintf(stderr,"gzcut: unrecognized flag bits 0x%02X\n",header.flg&0xE0);
    std::exit(1);
  }
  if(!(header.xfl==2||header.xfl==4||header.xfl==0)){
    std::fprintf(stderr,"gzcut: unrecognized compression flag bits combination: 0x%02X\n",header.xfl);
    std::exit(1);
  }

  enum{
    FTEXT   =0x01,
    FHCRC   =0x02,
    FEXTRA  =0x04,
    FNAME   =0x08,
    FCOMMENT=0x10,
  };

  if(header.flg&FEXTRA){
    mwg::u4t xlen;
    head.read(xlen);
    head.seek(xlen,SEEK_CUR);
  }

  if(header.flg&FNAME){
    mwg::byte d=0;
    std::fprintf(stderr,"gzcut: filename: ");
    while(head.read(d)&&d!=0)putc(d,stderr);
    putc('\n',stderr);
  }

  if(header.flg&FCOMMENT){
    mwg::byte d=0;
    std::fprintf(stderr,"gzcut: comment: ");
    while(head.read(d)&&d!=0)putc(d,stderr);
    putc('\n',stderr);
  }

  if(header.flg&FHCRC){
    mwg::u2t crc16=0;
    head.read(crc16);
    std::fprintf(stderr,"gzcut: crc16: 0x%04X\n",crc16);
  }

  mwg::i8t csize=0;
  {
    mwg::i8t cur=head.tell();
    auto mark=head.mark();
    head.seek(-8,SEEK_END);
    csize=head.tell()-cur;

    mwg::u4t crc32;
    mwg::u4t isize;
    head.read(crc32);
    head.read(isize);

    std::fprintf(stderr,"gzcut: crc32: 0x%04X\n",crc32);
    std::fprintf(stderr,"gzcut: compressed size: %lld\n",(long long)csize);
    std::fprintf(stderr,"gzcut: original size: %lld mod 2^32\n",(long long)isize);
  }

  {
    a85encoder enc(stdout);
    mwg::byte b;
    for(mwg::i8t i=0;i<csize&&head.read(b);i++)
      enc.consume(b);
  }

  return 0;
}
