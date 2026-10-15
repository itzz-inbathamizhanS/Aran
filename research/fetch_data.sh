#!/usr/bin/env bash
# Downloads the Loghub 2k-line samples (real, unsanitised logs from 16 systems).
# Source: https://github.com/logpai/loghub (Zhu et al., ISSRE 2023). Research use only.
set -euo pipefail
mkdir -p "$(dirname "$0")/data" && cd "$(dirname "$0")/data"
for s in Linux Apache OpenSSH HDFS Android BGL Hadoop Spark Zookeeper Windows Thunderbird HealthApp Mac OpenStack Proxifier HPC; do
  curl -sSfL -o "${s}_2k.log" "https://raw.githubusercontent.com/logpai/loghub/master/${s}/${s}_2k.log"
done
