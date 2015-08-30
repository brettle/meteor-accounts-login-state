#!/bin/bash

export URL='http://localhost:4096/'

meteor test-packages ./ --driver-package test-in-console -p 4096 &
METEOR_PID=$!

sleep 2

phantomjs phantom-test-runner.js
STATUS=$?

kill $METEOR_PID
exit $STATUS
