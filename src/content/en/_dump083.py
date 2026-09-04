# -*- coding: utf-8 -*-
import json, io
src = json.loads(open(r'D:\FengLi\Web\fou\huideng-chanlin\src\content\articles\083ribenbenyuanfamenxie.json', encoding='utf-8').read())
out = io.StringIO()
for i in range(42):
    b = src['blocks'][i]
    t = b.get('t')
    out.write('===== BLOCK %d t=%s =====\n' % (i, t))
    if t in ('p', 'quote'):
        for k, seg in enumerate(b['inline']):
            href = seg.get('href', '')
            out.write('  [%d]%s: %s\n' % (k, (' href=' + href) if href else '', seg.get('s', '')))
    else:
        out.write('  text: %s\n' % b.get('text', ''))
open(r'D:\FengLi\Web\fou\huideng-chanlin\src\content\en\_src083.txt', 'w', encoding='utf-8').write(out.getvalue())
print('dumped', len(src['blocks']))
