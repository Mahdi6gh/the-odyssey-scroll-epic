#!/bin/bash
# Converts the raw assets into web-ready files in media/
set -e
cd "$(dirname "$0")/.."
FF="node_modules/ffmpeg-static/ffmpeg.exe"
ART="assets/عکس های هنری از ادیسه که باید استفاده کنی"
mkdir -p media/img media/video media/audio

img() { # src dest maxwidth
  "$FF" -y -loglevel error -i "$1" -vf "scale='min($3,iw)':-2" -c:v libwebp -quality 82 "media/img/$2.webp"
}

img assets/ai/Gemini_Generated_Image_xbtw45xbtw45xbtw.jpg odysseus 1200
img assets/ai/MASK-1-gold.webp mask-gold 1200
img assets/ai/Gemini_Generated_Image_jzp6crjzp6crjzp6.jpg ship 1600
img assets/ai/Gemini_Generated_Image_4n4xfb4n4xfb4n4x.jpg cyclops 1600
img assets/ai/Gemini_Generated_Image_wc73n1wc73n1wc73.jpg giants 1600
img assets/ai/Gemini_Generated_Image_m0u7axm0u7axm0u7.jpg agamemnon-alive 1376
"$FF" -y -loglevel error -i assets/ai/nolan-odysseus-redfigure-skeleton-army.webp -vf "scale=1376:768" -c:v libwebp -quality 85 media/img/agamemnon-dead.webp
img assets/ai/S16-bow-unstrung.webp bow 1600
img assets/hf/S01-trojan-horse.png trojan-horse 1600
img assets/hf/S08-pig-morph-strip.png pig-strip 1800
img assets/hf/S10-odysseus-mast.png mast 1000
img assets/hf/S10-sirens-frieze.png sirens 1800
img assets/hf/S15-penelope-loom.png penelope 1600
img assets/hf/S15-suitors-hall.png suitors 1800
img "assets/پالت رنگی مورد نظرم/5dbe0e76e97acc155d2a539a5f5ed987.jpg" hero-flame 1200
img "$ART/1147362442593755849.jpg" clay-band 1400
img "$ART/935833997592552655 (1).jpg" odysseus-vase 900
img "$ART/Acesse_ ULISSES E ARGOS (Fidelidade Canina), trecho do poema Odisséia.jpg" p-argos 1400
img "$ART/Arnold_Böcklin_-_Odysseus_und_Polyphemus_(1896).jpg" p-polyphemus 1920
img "$ART/Circe_Offering_the_Cup_to_Odysseus_(2457_x_4023px_ed.).jpg" p-circe 1100
img "$ART/Odiseo.jpg" p-sirens 900
img "$ART/the-procession-of-the-trojan-horse-into-troy-giovanni-domenico-tiepolo.jpg" p-trojan 1600
img "$ART/Assembly_of_the_Olympians.webp" p-olympians 1600
img "$ART/ZeusThunderbolt.webp" p-zeus 1200

vid() { # src dest
  "$FF" -y -loglevel error -i "assets/videos/$1.mp4" -an -vf "scale=-2:'min(720,ih)',format=yuv420p" \
    -c:v libx264 -preset slow -crf 26 -g 12 -keyint_min 12 -movflags +faststart "media/video/$2.mp4"
}
vid 3029241_0 cliff
vid 4722814_0 argos
vid 5881476_0 beggar-hall
vid 8296963_0 feast
vid 8761710_0 helmet-dusk

"$FF" -y -loglevel error -i "assets/Ludwig Goransson - Odysseus (320).mp3" -b:a 160k media/audio/odysseus-theme.mp3 2>/dev/null \
  || "$FF" -y -loglevel error -i "$USERPROFILE/Downloads/Ludwig Goransson - Odysseus (320).mp3" -b:a 160k media/audio/odysseus-theme.mp3

ls -la media/img media/video media/audio
