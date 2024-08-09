%{ for i, arn in endpoint_arns ~}
const ${i}Endpoint = "${arn}";
%{ endfor ~}