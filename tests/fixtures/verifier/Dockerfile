FROM python:3.13-alpine
COPY run.py /verifier/run
RUN chmod 555 /verifier/run
USER 65532:65532
ENTRYPOINT ["/verifier/run"]
