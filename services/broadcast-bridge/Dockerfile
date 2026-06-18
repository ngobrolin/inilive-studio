# syntax=docker/dockerfile:1

# Stage 1: build the gst-plugins-rs WHIP server source element.
#
# Ubuntu 24.04 ships GStreamer 1.24 C plugins, but its packaged
# gstreamer1.0-plugins-bad does NOT include `whipserversrc`. That element lives
# in the Rust `rswebrtc` plugin (gst-plugins-rs). Building the whole gitlab
# workspace failed repeatedly here: git dependency fetches (gtk-rs-core, etc.)
# hang, and the release build OOMs on the webrtc linker stage.
#
# Instead we build only the published crates.io `gst-plugin-webrtc` crate. The
# crate uses crates.io registry dependencies (no git submodule fetches) and we
# disable default features so the heavy aws/livekit/janus deps are skipped.
FROM docker.io/library/ubuntu:24.04 AS plugin-builder

ARG DEBIAN_FRONTEND=noninteractive
ARG RUST_VERSION=1.85.1
ARG GST_PLUGIN_WEBRTC_VERSION=0.13.6

ENV CARGO_HOME=/root/.cargo \
    RUSTUP_HOME=/root/.rustup \
    PATH=/root/.cargo/bin:$PATH \
    CARGO_REGISTRIES_CRATES_IO_PROTOCOL=sparse \
    CARGO_NET_RETRY=10 \
    CARGO_HTTP_TIMEOUT=600 \
    CARGO_BUILD_JOBS=1 \
    CARGO_INCREMENTAL=0 \
    CARGO_PROFILE_DEV_DEBUG=0 \
    CARGO_PROFILE_DEV_INCREMENTAL=false \
    CARGO_PROFILE_DEV_LTO=false \
    CARGO_PROFILE_DEV_CODEGEN_UNITS=16

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    build-essential \
    pkg-config \
    libssl-dev \
    libglib2.0-dev \
    libgstreamer1.0-dev \
    libgstreamer-plugins-base1.0-dev \
    libgstreamer-plugins-bad1.0-dev \
    && rm -rf /var/lib/apt/lists/*

RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \
    | sh -s -- -y --profile minimal --default-toolchain "${RUST_VERSION}" \
    && rustc --version \
    && cargo --version

WORKDIR /build

# Build from the published crate tarball, not the gst-plugins-rs git workspace.
# Use the static.crates.io CDN with an explicit User-Agent; the api/v1 download
# endpoint returns 403 without a User-Agent. Each step must fail loudly: do not
# wrap this in `|| true`, which previously masked a 403 and produced an image
# with no plugin.
RUN curl -fsSL -A "inilive-bridge-build/1.0" \
    "https://static.crates.io/crates/gst-plugin-webrtc/gst-plugin-webrtc-${GST_PLUGIN_WEBRTC_VERSION}.crate" \
    -o gst-plugin-webrtc.crate \
    && tar -xzf gst-plugin-webrtc.crate \
    && cd "gst-plugin-webrtc-${GST_PLUGIN_WEBRTC_VERSION}" \
    && cargo build -j1 --no-default-features --features "whip,v1_22" \
    && install -D -m 0755 target/debug/libgstrswebrtc.so /out/libgstrswebrtc.so \
    && strip --strip-debug /out/libgstrswebrtc.so

# Stage 2: bridge runtime with GStreamer C plugins + the built Rust plugin.
FROM docker.io/library/ubuntu:24.04 AS runtime

ARG DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    libssl3 \
    nodejs \
    gstreamer1.0-tools \
    gstreamer1.0-plugins-base \
    gstreamer1.0-plugins-good \
    gstreamer1.0-plugins-bad \
    gstreamer1.0-plugins-ugly \
    gstreamer1.0-libav \
    gstreamer1.0-nice \
    libgstreamer1.0-0 \
    libgstreamer-plugins-base1.0-0 \
    libgstreamer-plugins-bad1.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Install the built plugin into the arm64 multiarch GStreamer plugin directory.
COPY --from=plugin-builder /out/libgstrswebrtc.so /usr/lib/aarch64-linux-gnu/gstreamer-1.0/libgstrswebrtc.so

# Fail the image build if the required ingest/output elements are unavailable.
RUN gst-inspect-1.0 rswebrtc && gst-inspect-1.0 whipserversrc && gst-inspect-1.0 rtmp2sink

WORKDIR /app
COPY package.json ./
COPY src ./src

EXPOSE 8787 8788 8790-8810/udp

ENV BRIDGE_LISTEN_HOST=0.0.0.0

CMD ["node", "src/server.mjs"]
