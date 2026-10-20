import sys, subprocess, os
out, files = sys.argv[1], sys.argv[2:]
while len(files) < 9: files.append(files[-1])
inp = sum([['-i', f] for f in files], [])
fc = ''.join(f'[{i}:v]scale=640:360,drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:text=\'{os.path.basename(f)[2:-4]}\':x=5:y=340:fontsize=14:fontcolor=yellow:box=1:boxcolor=black[s{i}];' for i, f in enumerate(files))
lay = '|'.join(f'{(i%3)*640}_{(i//3)*360}' for i in range(9))
fc += ''.join(f'[s{i}]' for i in range(9)) + f'xstack=inputs=9:layout={lay}'
subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', *inp, '-filter_complex', fc, out], check=True)
