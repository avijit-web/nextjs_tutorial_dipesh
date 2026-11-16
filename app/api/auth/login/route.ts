import { generateToken, hashPassword } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { Role } from "@/generated/prisma/enums";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        {
          error: "name,email and password are required",
        },
        {
          status: 400,
        },
      );
    }

    const userFromDb = await prisma.user.findUnique({
      where: { email },
      include: {
        team: true,
      },
    });

    if (!userFromDb) {
      return NextResponse.json;
    }

    const hashedPassword = await hashPassword(password);

    const userCount = await prisma.user.count();

    const role = userCount === 0 ? Role.ADMIN : Role.USER;

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role,
      },
      include: {
        team: true,
      },
    });

    const token = generateToken(user.id);

    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        teamId: user.teamId,
        team: user.team,
        token,
      },
    });

    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (err) {
    console.log(err);
    console.error("Registration failed");
    return NextResponse.json({
      error: "Registration failed",
    });
  }
}
