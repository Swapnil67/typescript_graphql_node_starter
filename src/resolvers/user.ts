import { User } from "../entities/User";
import { MyContext } from "../types";
import argon2 from "argon2";
import { Arg, Ctx, Field, InputType, Mutation, ObjectType, Query, Resolver } from "type-graphql";

@InputType() 
class UsernamePasswordInput {
  @Field()
  username: string
  @Field()
  password: string
}

@ObjectType()
class FieldError {
  @Field()
  field: string;
  @Field()
  message: string;
}

@ObjectType()
class UserResponse {
  @Field(() => [FieldError], {nullable: true})
  errors?: FieldError[];
  @Field(() => User, {nullable: true})
  user?: User;
}

@Resolver()
export class UserResolver {

  @Query(() => User, {nullable: true})
  async me(
    @Ctx() {req, em}: MyContext
  ) {
    console.log(req.session);
    
    if(!req.session.userId) {
      return null;
    }
    const user = await em.findOne(User, {id: req.session.userId});
    console.log(user);
    return user;    
  }


  @Mutation(() => UserResponse)
  async register(
    @Arg('options') options: UsernamePasswordInput,
    @Ctx() {em}: MyContext
  ): Promise<UserResponse> {
    if(options.username.length <= 2) {
      return {
        errors: [{
          field: "username",
          message: "Length must be greater than 2"
        }]
      }
    }
    if(options.password.length <= 2) {
      return {
        errors: [{
          field: "password",
          message: "Length must be greater than 2"
        }]
      }
    }
    const hashedPassword = await argon2.hash(options.password)
    const user = em.create(User, {username: options.username, password: hashedPassword});
    try {
      await em.persistAndFlush(user);
    } catch (err) {
      if(err.code === "23505"){
        return {
          errors: [{
            field: "username",
            message: "Username is already taken"
          }]
        }
      }
      console.log(err);
    }
    return {
      user
    };
  }

  @Mutation(() => UserResponse)
  async login(
    @Arg('options') options: UsernamePasswordInput,
    @Ctx() { em, req }: MyContext
  ): Promise<UserResponse> {
    // Check the User Exists or Not
    const user = await em.findOne(User, {username: options.username});
    if(!user) {
      return {
        errors: [{
          field: "username",
          message: "That username doesn't exists"
        }]
      }
    }
    // Check the Password
    const isValid = await argon2.verify(user.password, options.password.toLowerCase());
    if(!isValid) {
      return {
        errors: [{
          field: "password",
          message: "Incorrrect"
        }]
      }
    }
    req.session!.userId = user.id;
    console.log(req.session);
    
    return {
      user
    }
  }
}

/*
mutation LoginUser($loginOptions: UsernamePasswordInput!) {
  login(options: $loginOptions) {
    errors {
      field,
      message
    }
    user {
      id,
      username
    }
  }
}

{
  "loginOptions": {
    "username": "vegeta",
    "password": "test1234"
  }
}
*/