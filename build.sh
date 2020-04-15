#!/bin/bash
SERVER=$1

if [[ "$GIT_BRANCH" == "origin/master" ]]; then
    rsync -avz --exclude '.env' --exclude 'public' --exclude 'node_modules' --exclude 'dist' $JENKINS_HOME/workspace/PF-Analytic/ root@107.23.135.100:/var/www/pf-analytic
    ssh root@107.23.135.100 'cd /var/www/pf-analytic && yarn && yarn restart'
#elif [[ "$GIT_BRANCH" == "origin/development" ]]; then
 #   rsync -av $JENKINS_HOME/workspace/PF-CTA-Core-Dev/build/* root@$SERVER:/var/www/pf-cta/build
fi

rm -rf "$JENKINS_HOME/workspace/$JOB_NAME@tmp" 2> /dev/null
