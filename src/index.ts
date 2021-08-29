import "reflect-metadata";
import { MikroORM } from '@mikro-orm/core'
import { __prod__ } from './constant';
import express from 'express';
import microConfig from "./mikro-orm.config";
import { ApolloServer } from 'apollo-server-express';
import { buildSchema } from 'type-graphql';
import { HelloResolver } from './resolvers/hello';
import { PostResolver } from "./resolvers/post";
import { UserResolver } from "./resolvers/user";
import redis from 'redis';
import cors from 'cors';
import session from 'express-session';
import connectRedis from 'connect-redis'
import { MyContext } from "./types";


const main = async () => {
  const orm = await MikroORM.init(microConfig);
  await orm.getMigrator().up() // Running the migrator
  const app = express();
  // CORS configuration
  const corsOptions = {
      origin: 'https://studio.apollographql.com',
      credentials: true
  }
  app.use(cors(corsOptions));
  const RedisStore = connectRedis(session)
  const redisClient = redis.createClient()
  
  app.use(  // The session middleware should come before the Apollo Middlewawre
    session({
      name: "foo",
      saveUninitialized: false,
      secret: "sd0ru8jg938269urouse[pr0tik34q65",
      resave: false,
      cookie: {
        httpOnly: true,  // Now we cannot access cookie in frontend
        secure: false, // secure only works in https
        sameSite: 'none',
        maxAge: 1000 * 60 * 60 * 24 * 7, //10 years
        domain: 'localhost'
      },
    })
  )

  const apolloServer = new ApolloServer({
    schema: await buildSchema({
      resolvers: [HelloResolver, PostResolver, UserResolver],
      validate: false,
    }),
    context: ({req, res}): MyContext => ({ em: orm.em, req, res })
  });
  // Starting the apolloServer
  await apolloServer.start();

  // Creating graphql endpoint on express
  apolloServer.applyMiddleware({ app, path: "/", cors: false })

  app.listen(4000, () => {
    console.log("Server Running on Port: 3000🔥");
  })
}

main().catch(err => {
  console.log(err);
})

/*
const main = async () => {
  const orm = await MikroORM.init(microConfig);
  await orm.getMigrator().up() // Running the migrator
  // const post = orm.em.create(Post, {title: "My first Post"}); // Nothing Changes in DB
  // await orm.em.persistAndFlush(post) // Saves to DB
  // console.log("----------------sql 2--------------------");  
  // await orm.em.nativeInsert(Post, {title: "my first post 2"}); // This will not work  
  // const posts = await orm.em.find(Post, {});
  // console.log(posts); 
}

*/