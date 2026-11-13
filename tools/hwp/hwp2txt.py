import sys, zlib, struct, olefile
f = olefile.OleFileIO(sys.argv[1])
hdr = f.openstream('FileHeader').read()
compressed = bool(struct.unpack('<I', hdr[36:40])[0] & 1)
sections = sorted([s for s in f.listdir() if s[0]=='BodyText'], key=lambda s:int(s[1].replace('Section','')))
out=[]
for s in sections:
    data = f.openstream(s).read()
    if compressed: data = zlib.decompress(data, -15)
    i=0
    while i < len(data):
        h = struct.unpack('<I', data[i:i+4])[0]
        tag = h & 0x3ff; level=(h>>10)&0x3ff; size = (h>>20)&0xfff
        i+=4
        if size==0xfff:
            size=struct.unpack('<I', data[i:i+4])[0]; i+=4
        rec=data[i:i+size]; i+=size
        if tag==67:  # HWPTAG_PARA_TEXT
            t=[]; j=0
            while j < len(rec):
                c=struct.unpack('<H', rec[j:j+2])[0]
                if c in (1,2,3,11,12,14,15,16,17,18,21,22,23):  # extended ctrl: 8 wchar
                    j+=16; continue
                if c in (4,5,6,7,8,9,19,20):  # inline ctrl
                    if c==9: t.append('\t')
                    j+=16; continue
                if c in (10,13): t.append('\n'); j+=2; continue
                if c<32: j+=2; continue
                t.append(chr(c)); j+=2
            out.append(''.join(t).rstrip('\n'))
print('\n'.join(out))
