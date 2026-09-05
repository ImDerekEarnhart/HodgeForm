FROM python:3.13-alpine
RUN addgroup -g 10001 sandbox && adduser -D -u 10001 -G sandbox sandbox \
  && mkdir -p /opt/hodgeform /runtime/sandbox \
  && chown -R sandbox:sandbox /opt/hodgeform /runtime
COPY --chown=sandbox:sandbox server.py /opt/hodgeform/server.py
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 HODGEFORM_SANDBOX_UID=10001 HODGEFORM_SANDBOX_GID=10001
USER sandbox
ENTRYPOINT ["python3","/opt/hodgeform/server.py"]
