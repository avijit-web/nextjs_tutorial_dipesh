import { generateToken, hashPassword, verifyPassword } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { Role } from "@/generated/prisma/enums";
import { NextRequest, NextResponse } from "next/server";
import { error } from "node:console";

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
      return NextResponse.json(
        {
          error: "Invalid Credentials",
        },
        {
          status: 401,
        },
      );
    }

    const isValidPassword = await verifyPassword(password, userFromDb.password);

    if (!isValidPassword) {
      return NextResponse.json(
        {
          error: "Invalid credentials",
        },
        {
          status: 401,
        },
      );
    }

    const token = generateToken(userFromDb.id);

    const response = NextResponse.json({
      user: {
        id: userFromDb.id,
        email: userFromDb.email,
        name: userFromDb.name,
        role: userFromDb.role,
        teamId: userFromDb.teamId,
        team: userFromDb.team,
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
    console.error("login failed");
    return NextResponse.json({
      error: "Registration failed",
    });
  }
}
