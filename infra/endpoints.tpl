%{ for i, arn in endpoint_arns ~}
export const ${i}Endpoint = "${arn}";
%{ endfor ~}