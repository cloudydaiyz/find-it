const endpoints = {
%{ for i, arn in endpoint_arns ~}
    ${i}: "${arn}";
%{ endfor ~}
}