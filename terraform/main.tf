resource "local_file" "foo" {
  content  = templatefile("${path.module}/endpoints.tpl", { port = 8080, ip_addrs = ["10.0.0.1", "10.0.0.2"] })
  filename = "${path.module}/foo.js"
}