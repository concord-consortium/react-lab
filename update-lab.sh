#!/usr/bin/env bash

wget http://lab-framework.concord.org/version/$1/lab.tar.gz
rm -rf lab/lab
tar -C lab -zxvf lab.tar.gz
rm lab.tar.gz
