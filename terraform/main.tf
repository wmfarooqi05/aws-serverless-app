provider "aws" {
  profile = "default"
  region = "us-east-1"  # Change this to your desired region
}

# data "aws_secretsmanager_secret" "dbcreds" {
#   name = "dbcreds"
# }

# data "aws_secretsmanager_secret_version" "secret_credentials" {
#   secret_id = data.aws_secretsmanager_secret.dbcreds.id
#   secret_string = jsonencode({
#     username = "postgres",
#     password = "postgres_qasid123"
#   })
# }

# data "aws_secretsmanager_secret" "global_employment_database_secret" {
#   name = "global_employment_database_secret"
# }

# resource "aws_secretsmanager_secret_version" "global_employment_database_secret" {
#   secret_id     = data.aws_secretsmanager_secret.global_employment_database_secret.id
#   secret_string = jsonencode({
#     username = "postgres",
#     password = "postgres_qasid123"
#   })
# }

resource "aws_db_instance" "global_employment_db" {
  allocated_storage    = 20
  storage_type        = "gp2"
  engine              = "postgres"
  engine_version      = "15.2"
  instance_class      = "db.t3.micro"
  identifier          = "global-employment-proxy-test"
  # name                = "global-employment"
  username            = "postgres"
  password            = "postgres_qasid123"

  # dynamic "password" {
  #   for_each = [aws_secretsmanager_secret_version.global_employment_database_secret_version.secret_string]
  #   content {
  #     password = jsondecode(password.value)["password"]
  #   }
  # }

  parameter_group_name = "default.postgres15"
  
  skip_final_snapshot = true
  
  tags = {
    Name = "global-employment-proxy-test"
  }
}

resource "aws_db_proxy" "global_employment_proxy" {
  name                     = "global-employment-proxy"
  debug_logging           = false
  engine_family           = "POSTGRESQL"
  idle_client_timeout     = 1800
  role_arn                = aws_iam_role.proxy_role.arn
  require_tls            = true
  vpc_security_group_ids = [aws_security_group.proxy_sg.id]
  vpc_subnet_ids         = aws_subnet.global_employment_subnets.*.id

  auth {
    auth_scheme = "SECRETS"
    description = "RDS Prxoy Test Authentication"
    secret_arn  = "arn:aws:secretsmanager:us-east-1:524073432557:secret:proxy_test_secret-27cj4e"
    #aws_secretsmanager_secret_version.secret_credentials.arn

    # description_kms_key_id = aws_kms_key.global_employment_key.arn

    # iam_auth = {
    #   description = "RDS Prxoy Test IAM authentication"
    # }
  }
}

resource "aws_iam_role" "proxy_role" {
  name = "rds-proxy-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Action = "sts:AssumeRole",
        Effect = "Allow",
        Principal = {
          Service = "rds.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_vpc" "global_employment_vpc" {
  cidr_block = "10.0.0.0/16"
  
  tags = {
    Name = "GlobalEmploymentVPC"
  }
}

resource "aws_subnet" "global_employment_subnets" {
  count = 2  # Change this based on your setup
  
  cidr_block = element(["10.0.1.0/24", "10.0.2.0/24"], count.index)  
  vpc_id = aws_vpc.global_employment_vpc.id

  tags = {
    Name = "GlobalEmploymentSubnet-${count.index}"
  }
}

resource "aws_security_group" "proxy_sg" {
  name_prefix = "proxy-"
  
  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
