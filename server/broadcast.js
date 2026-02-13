let broadcaster = null;

export function setBroadcaster(fn) {
  broadcaster = fn;
}

export function broadcast(data) {
  if (broadcaster) broadcaster(data);
}
