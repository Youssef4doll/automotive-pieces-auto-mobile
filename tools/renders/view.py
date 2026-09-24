import sys
from PIL import Image
ims=[Image.open(p).convert('RGBA') for p in sys.argv[2:]]
w=max(i.size[0] for i in ims); h=max(i.size[1] for i in ims)
cols=min(4,len(ims)); rows=(len(ims)+cols-1)//cols
sheet=Image.new('RGBA',(w*cols,h*rows),(232,236,242,255))
for k,im in enumerate(ims):
    bg=Image.new('RGBA',im.size,(232,236,242,255)); bg.alpha_composite(im)
    sheet.paste(bg,((k%cols)*w,(k//cols)*h))
sheet.convert('RGB').save(sys.argv[1])
