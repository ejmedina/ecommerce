import { hash } from "bcryptjs"

async function main() {
  const password = process.argv[2] || "admin123"
  const hashed = await hash(password, 10)
  console.log(hashed)
}

main()
