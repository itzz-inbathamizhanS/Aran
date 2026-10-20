# usage: bash qa.sh id1 id2 ...  -> qa/<id>.jpg (9 frames spread over the scene)
export NODE_PATH=$(npm root -g)
for id in "$@"; do
  ts=$(python3 -c "
import json;T=json.load(open('timing.json'));s=[s for s in T['scenes'] if s['id']=='$id'][0]
a,b=s['start']+1.2,s['end']-0.5
print(' '.join(f'{a+(b-a)*i/8:.2f}' for i in range(9)))")
  node snap.js qa/$id $ts | sed "s/^/$id: /"
  files=$(for t in $ts; do echo qa/${id}_$t.png; done)
  python3 sheet9.py qa/$id.jpg $files && rm $files
done
