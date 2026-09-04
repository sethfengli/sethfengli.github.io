# -*- coding: utf-8 -*-
import json, io, re
src = json.loads(open(r'D:\FengLi\Web\fou\huideng-chanlin\src\content\articles\230guanjingzhu.json', encoding='utf-8').read())
f = r'D:\FengLi\Web\fou\huideng-chanlin\src\content\en\230guanjingzhu.p2.json'
raw = open(f, encoding='utf-8').read()
out = json.loads(raw)
sb = src['blocks'][87:168]
ob = out['blocks']
log = io.StringIO()
log.write('firstBlock=%d out_blocks=%d expected=%d\n' % (out['firstBlock'], len(ob), len(sb)))
mism = 0
for i in range(max(len(sb), len(ob))):
    ss = sb[i] if i < len(sb) else None
    oo = ob[i] if i < len(ob) else None
    st = ss['t'] if ss else 'MISSING'
    ot = oo['t'] if oo else 'MISSING'
    sn = len(ss['inline']) if ss and 'inline' in ss else (1 if ss else 0)
    on = len(oo['inline']) if oo and 'inline' in oo else (1 if oo else 0)
    if st != ot:
        log.write('block %d TYPE src=%s out=%s\n' % (i+87, st, ot)); mism += 1
    if st in ('p','quote') and sn != on:
        log.write('block %d SEG src=%d out=%d t=%s\n' % (i+87, sn, on, st)); mism += 1
    if st in ('p','quote'):
        for k in range(min(sn, on)):
            sh = ss['inline'][k].get('href'); oh = oo['inline'][k].get('href')
            if sh != oh:
                log.write('block %d seg %d HREF src=%r out=%r\n' % (i+87, k, sh, oh)); mism += 1
cjk = re.findall(r'[\u4e00-\u9fff\u3400-\u4dbf\u3000-\u303f\uff00-\uffef]', raw)
log.write('cjk/fullwidth=%d\n' % len(cjk))
log.write('bom=%s\n' % (raw[:1]=='\ufeff'))
log.write('bytes=%d\n' % len(raw.encode('utf-8')))
log.write('total mismatches=%d\n' % mism)
open(r'D:\FengLi\Web\fou\huideng-chanlin\src\content\en\_val230.txt','w',encoding='utf-8').write(log.getvalue())
print('done')
