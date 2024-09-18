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

async function getChatList(userId) {
  try {
    const userChats = await prisma.chat.findMany({
      where: {
        participants: {
          some: {
            userId: userId
          }
        }
      },
      include: {
        participants: true, 
        messages: {
          orderBy: {
            sentAt: 'desc' 
          },
          take: 1 
        },
        createdByUser: true 
      }
    });

    return userChats;
  } catch (error) {
    console.error('Error getting chat list', error);

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

  async function getDirectChat(user1,user2) {
    try {
      const directChat = await prisma.chat.findFirst({
        where: {
          type: 'direct',
          participants: {
            some: {
              userId: user1
            },
            some: {
              userId: user2
            }
          }
        },
        include: {
          participants: true
        }
      });

      return directChat;
    } catch (error) {
      console.error('Error fetching chat:', error);
    }
  }

  async function getChatById(chatId) {
    try {
      const chat = await prisma.chat.findUnique({
        where: { id: chatId },
        include: {
          participants: {
            include: {
              user: {
                include: {
                  profile: true 
                }
              }
            }
          }
        }
      });
  
      console.log(JSON.stringify(chat, null, 2)); // Per vedere la struttura della risposta
      return chat;
    } catch (error) {
      console.error('Error fetching chat:', error);
    }
  }


  async function newDirectChat(userId1, userId2, message) {
    try {
      const newChat = await prisma.chat.create({
        data: {
          type: 'direct',
          createdBy: userId1,
          participants: {
            create: [
              { userId: userId1 },
              { userId: userId2 },
            ]
          },
          messages: {
            create: {
              senderId: userId1,
              text: message,
            }
          }
        },
        include: {
          participants: true,
          messages: true,
        }
      });
    
      return newChat;

    } catch (error) {
      console.error('Error creating chat:', error);
      res.status(500).json({ error: 'Error creating chat' });
    }
  }

  async function newMessage(chatId, senderId, text) {
    try {
      const newMessage = await prisma.message.create({
        data: {
          chatId: chatId,    
          senderId: senderId, 
          text: text,         
        },
        include: {
          sender: true, 
          chat: true,   
        }
      });
    
      console.log('New message crated:', newMessage);
      return newMessage;
    } catch (error) {
      console.error('Error creating message:', error);
  res.status(500).json({ error: 'Error creating message' });
    }
  }

  module.exports = {
    createUserWithProfile,
    getUserByUsername,
    getUserById,
    getUserList,
    getDirectChat,
    getChatById,
    newDirectChat,
    getChatList,
    newMessage,
  }