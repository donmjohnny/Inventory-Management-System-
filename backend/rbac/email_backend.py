import ssl
from django.core.mail.backends.smtp import EmailBackend as DjangoEmailBackend
from django.core.mail.utils import DNS_NAME

class CustomEmailBackend(DjangoEmailBackend):
    """
    A custom SMTP email backend that patches starttls() and SMTP initialization
    arguments to support Python 3.12+, which completely removed the legacy,
    deprecated 'keyfile' and 'certfile' parameters from standard libraries.
    """
    def open(self):
        if self.connection:
            return False

        connection_params = {'local_hostname': DNS_NAME.get_fqdn()}
        if self.timeout is not None:
            connection_params['timeout'] = self.timeout
        
        try:
            # Avoid passing keyfile/certfile to connection_class if they are None (Python 3.12+ compatibility)
            if self.use_ssl:
                if self.ssl_keyfile or self.ssl_certfile:
                    context = ssl.create_default_context()
                    if self.ssl_certfile:
                        context.load_cert_chain(self.ssl_certfile, self.ssl_keyfile)
                    connection_params['context'] = context
            
            self.connection = self.connection_class(self.host, self.port, **connection_params)

            if not self.use_ssl and self.use_tls:
                # Avoid passing keyfile/certfile to starttls if they are None (Python 3.12+ compatibility)
                if self.ssl_keyfile or self.ssl_certfile:
                    context = ssl.create_default_context()
                    if self.ssl_certfile:
                        context.load_cert_chain(self.ssl_certfile, self.ssl_keyfile)
                    self.connection.starttls(context=context)
                else:
                    self.connection.starttls()
            
            if self.username and self.password:
                self.connection.login(self.username, self.password)
            return True
        except OSError:
            if not self.fail_silently:
                raise
