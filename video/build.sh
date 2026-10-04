#!/bin/bash
set -e
cd "$(dirname "$0")"
JP=/usr/share/fonts/opentype/ipafont-gothic/ipag.ttf
EN=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf
FPS=30
# seg <out> <img> <dur> <zoomdir in|out> <drawtext filters>
seg() {
  out=$1 img=$2 d=$3 z=$4 txt=$5
  if [ "$z" = in ]; then ZE="1+0.006*on"; else ZE="1.18-0.006*on"; fi
  ffmpeg -loglevel error -y -loop 1 -framerate $FPS -t $d -i "$img" -filter_complex "
  [0]split[a][b];
  [a]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=40:2,eq=brightness=-0.25:saturation=1.2[bg];
  [b]scale=2160:2160,zoompan=z='$ZE':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=1080x1080:fps=$FPS[fg];
  [bg][fg]overlay=0:420,format=yuv420p${txt:+,$txt}[v]" -map "[v]" -r $FPS -t $d -c:v libx264 -preset medium -crf 18 "$out"
}
# text helper: fade-in title
T() { # text font size y start color box
  echo "drawtext=fontfile=$2:text='$1':fontsize=$3:fontcolor=$6:x=(w-text_w)/2:y=$4:alpha='min(1,max(0,(t-$5)*6))':box=1:boxcolor=$7:boxborderw=24"
}
RED='0xC8102E'
# 1 Hook: black bg with kanji punch
ffmpeg -loglevel error -y -f lavfi -i color=c=black:s=1080x1920:r=$FPS:d=2.2 -vf "
drawtext=fontfile=$JP:text='大麻愛':fontsize='if(lt(t,0.35),480-800*t,200)':fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2-120,
drawbox=x=240:y=1060:w='min(600,t*1800)':h=10:color=$RED:t=fill,
drawtext=fontfile=$EN:text='TAIMA · AI':fontsize=72:fontcolor=white:x=(w-text_w)/2:y=1110:alpha='min(1,max(0,(t-0.5)*5))',
drawtext=fontfile=$EN:text='= CANNABIS LOVE':fontsize=60:fontcolor=$RED:x=(w-text_w)/2:y=1210:alpha='min(1,max(0,(t-0.9)*5))',format=yuv420p" -c:v libx264 -crf 18 s1.mp4
seg s2.mp4 tee_hang.jpg 2.0 in "$(T 'JAPANESE CALLIGRAPHY TEE' $EN 64 230 0.1 white $RED@0.95)"
seg s3.mp4 tee_person2.jpg 1.6 out "$(T 'BOLD BRUSH KANJI' $EN 64 230 0.1 white black@0.7)"
seg s4.mp4 tee_back.jpg 1.8 in "$(T '420 HANKO SEAL ON BACK' $EN 64 230 0.1 white $RED@0.95),$(T '四二零' $JP 90 1560 0.4 white black@0.6)"
seg s5.mp4 tee_duo.jpg 1.6 out "$(T 'BLACK OR WHITE' $EN 64 230 0.1 white black@0.7)"
seg s6.mp4 mug_ctx1.jpg 2.0 in "$(T 'MATCHING MUG' $EN 72 230 0.1 white $RED@0.95),$(T 'GLOSSY BLACK · 11oz' $EN 50 1580 0.4 white black@0.6)"
seg s7.mp4 mug_angled.jpg 1.6 out "$(T 'PRINTED BOTH SIDES' $EN 64 230 0.1 white black@0.7)"
# 8 Outro
ffmpeg -loglevel error -y -f lavfi -i color=c=black:s=1080x1920:r=$FPS:d=3.0 -vf "
drawtext=fontfile=$JP:text='大麻愛':fontsize=170:fontcolor=white:x=(w-text_w)/2:y=520,
drawtext=fontfile=$EN:text='THE 420 GIFT':fontsize=70:fontcolor=white:x=(w-text_w)/2:y=800:alpha='min(1,t*4)',
drawtext=fontfile=$EN:text='SHOP NOW ON ETSY':fontsize=84:fontcolor=white:x=(w-text_w)/2:y=1000:box=1:boxcolor=$RED:boxborderw=34:alpha='min(1,max(0,(t-0.3)*5))',
drawtext=fontfile=$EN:text='Search  \"Taima Ai Kanji\"':fontsize=52:fontcolor=0xDDDDDD:x=(w-text_w)/2:y=1200:alpha='min(1,max(0,(t-0.7)*5))',
drawtext=fontfile=$EN:text='LINK IN BIO':fontsize=56:fontcolor=$RED:x=(w-text_w)/2:y=1320:alpha='min(1,max(0,(t-1.0)*5))*(0.6+0.4*sin(t*8))',format=yuv420p" -c:v libx264 -crf 18 s8.mp4
# join with quick transitions
X=0.2
durs=(2.2 2.0 1.6 1.8 1.6 2.0 1.6 3.0)
trans=(zoomin slideleft slideup slideleft fadeblack slideleft fade)
inputs=""; for i in 1 2 3 4 5 6 7 8; do inputs="$inputs -i s$i.mp4"; done
fc=""; prev="[0:v]"; off=0
for i in 0 1 2 3 4 5 6; do
  off=$(python3 -c "print(round($off+${durs[$i]}-$X,3))")
  out="[x$i]"; [ $i = 6 ] && out="[vout]"
  fc="$fc${prev}[$((i+1)):v]xfade=transition=${trans[$i]}:duration=$X:offset=$off$out;"
  prev="[x$i]"
done
TOTAL=$(python3 -c "print(round(sum([$(IFS=,; echo "${durs[*]}")])-7*$X,3))")
# simple synthesized beat (128bpm kick + hat)
ffmpeg -loglevel error -y -f lavfi -i "aevalsrc='0.9*sin(2*PI*(50+120*exp(-mod(t,0.46875)*30))*mod(t,0.46875))*exp(-mod(t,0.46875)*9)+0.12*(random(0)-0.5)*exp(-mod(t+0.234,0.46875)*60)':s=44100:d=$TOTAL" -af "afade=t=out:st=$(python3 -c "print($TOTAL-1.2)"):d=1.2,volume=0.8" beat.wav
ffmpeg -loglevel error -y $inputs -i beat.wav -filter_complex "${fc%;}" -map "[vout]" -map 8:a -c:v libx264 -preset medium -crf 19 -pix_fmt yuv420p -c:a aac -b:a 160k -shortest -movflags +faststart out.mp4
echo "done total=$TOTAL"
