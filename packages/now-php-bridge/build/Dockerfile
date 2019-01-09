FROM library/centos:6.8
RUN yum -y install wget git
RUN rpm -Uvh https://mirror.webtatic.com/yum/el6/latest.rpm
RUN yum -y install \
  php71w-cli php71w-fpm php71w-mbstring php71w-mysql php71w-opcache \
  php71w-gd php71w-xml
RUN yum -y install epel-release
RUN yum -y install patchelf

RUN mkdir -p /root/app/public
RUN mkdir -p /root/app/native

WORKDIR /root/app

COPY ./php.ini /root/app/native/php.ini
COPY ./php-fpm.ini /root/app/native/php-fpm.ini
COPY ./test.php /root/app/test.php
COPY ./test.sh /root/app/test.sh

CMD ["/bin/bash", "test.sh"]
