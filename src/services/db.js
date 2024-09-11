const { PrismaClient }  = require('@prisma/client');

const prisma = new PrismaClient();

async function getUserList(userId) {
  try {
    const users = await prisma.user.findMany({
      where: {
        NOT: {
          id: userId
        }
      },
      include: {
        profile: true,
      }
    });
    
    return users;
  } catch (error) {
    console.error('Error fetching users list:', error);
    throw error;
  }
}

async function getUserByUsername(username) {
    try {
        const user = await prisma.user.findUnique({
            where: { username: username },
            include: {
                profile: true,
            },
        })
        return user;
    } catch (error) {
        console.error('Error getting user:', error);
    }
}

async function getUserById(userId) {
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                profile: true,
            },
        })
        return user;
    } catch (error) {
        console.error('Error getting user:', error);
    }
}

async function createUserWithProfile(userName, password, avatarUrl, fullName, aboutMe) {
    try {
      const [newUser, newProfile] = await prisma.$transaction([
        prisma.user.create({
          data: {
            username: userName,
            password: password,
          },
        }),
        prisma.profile.create({
          data: {
            user: {
              connect: { username: userName },
            },
            avatar: avatarUrl,
            fullName: fullName,
            aboutMe: aboutMe,
            isOnline: false,
          },
        }),
      ]);
  
      console.log('User created:', newUser);
      console.log('Profile created:', newProfile);
    } catch (error) {
      console.error('Error creating user or profile:', error);
    } finally {
      await prisma.$disconnect();
    }
  }

  module.exports = {
    createUserWithProfile,
    getUserByUsername,
    getUserById,
    getUserList
  }