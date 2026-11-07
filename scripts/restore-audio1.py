from pathlib import Path
import subprocess,hashlib
root=Path(__file__).resolve().parents[1]
src=root/'fixtures/audio1.flac';out=root/'fixtures/audio1.wav'
assert hashlib.sha256(src.read_bytes()).hexdigest()=='a8a4bb6f97184a3951a2e4f601f0e721c8f0e268395dc202e276e29e1f7328ae'
subprocess.run(['ffmpeg','-v','error','-y','-i',str(src),'-c:a','pcm_s16le','-fflags','+bitexact','-flags:a','+bitexact','-map_metadata','-1',str(out)],check=True)
assert hashlib.sha256(out.read_bytes()).hexdigest()=='d3e86159ff80c746cbf9ebaa3df2bb8b21b8d5d7ef8e6c2291cd9c2faa3d2228'
print('Exact audio1 WAV restored and SHA verified')
