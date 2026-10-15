#!/usr/bin/env bash
# Real public corpora for the AI and immune layers. Research use only; not committed.
#   CoNLL-2003 English NER (Tjong Kim Sang & De Meulder 2003), mirror used by the glample/tagger repo
#   HiNER Hindi NER, collapsed PER/LOC/ORG (Murthy et al., LREC 2022), CC-BY-SA-4.0
#   Hinglish code-mixed NER tweets (Singh et al., 2018), SilentFlame/Named-Entity-Recognition
#   UCI SMS Spam Collection (Almeida et al. 2011), real SMS used as hard negatives
#   Loghub BGL 2k structured logs with alert labels (Zhu et al., ISSRE 2023)
set -euo pipefail
mkdir -p "$(dirname "$0")/data/ai" && cd "$(dirname "$0")/data/ai"
get() { [ -s "$2" ] || curl -sSfL -o "$2" "$1"; }
for s in train testa testb; do get "https://raw.githubusercontent.com/glample/tagger/master/dataset/eng.$s" "conll_$s.txt"; done
for s in train validation test; do get "https://raw.githubusercontent.com/cfiltnlp/HiNER/main/data/collapsed/$s.conll" "hiner_$s.conll"; done
get "https://raw.githubusercontent.com/SilentFlame/Named-Entity-Recognition/master/Twitterdata/annotatedData.csv" hinglish_ner.csv
get "https://raw.githubusercontent.com/mohitgupta-omg/Kaggle-SMS-Spam-Collection-Dataset-/master/spam.csv" sms_spam.csv
get "https://raw.githubusercontent.com/logpai/loghub/master/BGL/BGL_2k.log_structured.csv" BGL_2k_structured.csv
