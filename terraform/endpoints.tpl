%{ for i, addr in ip_addrs ~}
const backend${i} = "${addr}:${port}"
%{ endfor ~}