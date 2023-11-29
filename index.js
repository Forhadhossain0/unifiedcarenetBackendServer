const express = require('express');
const cors = require('cors');
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const port = process.env.PORT || 5000;

app.use(express.json());
app.use(cors());


// monogodb oparation 
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.3worizk.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // await client.connect();
    const MYDB  =  client.db('unifiedcarenetDB');
    const Users_Collection = MYDB.collection('users')
    const Camp_Collection = MYDB.collection('camp')
    const RegisterdCamp_Collection = MYDB.collection('registerdCamp')
    const UserReviews_Collection = MYDB.collection('reviews')
    const Payment_Collection = MYDB.collection('payment')



        // jwt oparation
        app.post('/jwt', async(req,res)=>{
            const query = req.body;
            const token = jwt.sign(query,process.env.JWT_ACCESS_TOKEN, {expiresIn : '1h'})
            res.send({token})
          })

      
        // midleware
         const verifyToken = (req,res,next)=>{
        //   console.log(req.headers.authorization , 'inside verifytoken')
          if(!req.headers.authorization){
            return res.status(401).send({message: 'unauthorized token access haha'}) 
          }
          const token = req.headers.authorization;
          // const token = req.headers.authorization.split(' ')[1];
          jwt.verify(token,process.env.JWT_ACCESS_TOKEN, (err,decoded)=>{
            if(err){
              return res.status(401).send({message: 'unauthorized token access haha'})
            }
            req.decoded = decoded;
            next();
          })
                
         }


         
         
         
         

         const verifyOrganizer = async(req,res,next)=>{
        const email = req.decoded.email;
        const query = {email: email};
        const user = await Users_Collection.findOne(query);
        const isAdmin  =  user?.role === 'organizer';
        if(!isAdmin){
          return res.status(401).send({message: 'unauthorized admin'})
        }
        next()
     }

    const verifyProfessionals = async(req,res,next)=>{
      const email = req.decoded.email;
      const query = {email: email};
      const user = await Users_Collection.findOne(query);
      const isProfessionals  =  user?.role === 'professionals';
      if(!isProfessionals){
        return res.status(401).send({message: 'unauthorized professionals'})
      }
      next()
    }
    
    
    app.get('/users', async (req, res) => {
      const result = await Users_Collection.find().toArray();
      res.send(result);
    });
    
    app.patch('/users/organizer/:id',verifyToken,verifyOrganizer,  async(req,res)=>{
      const id = req.params.id;
      // console.log(id)
      const filter = {_id: new ObjectId(id)};
      const updatedDoc = {
        $set:{
                  role : 'organizer'
              }
          };
          const result = await Users_Collection.updateOne(filter,updatedDoc);
          res.send(result)
        })
      
       app.get('/users/organizer/:email' ,verifyToken, verifyOrganizer, async(req,res)=>{
           const email = req.params.email;
           
           if(email !== req.decoded.email){
             res.status(403).send({message: 'forbiden organizer access'})
               return;
              }
          const query = {email: email};
          const user = await Users_Collection.findOne(query);
          let organizer = false;
          if(user){
            organizer = user?.role === 'organizer'
          }
          res.send({organizer})
        })
      

        
        
        //   profeessionals
        app.patch('/users/professionals/:id',verifyToken, verifyProfessionals,  async(req,res)=>{
          const id = req.params.id;
         const filter = {_id: new ObjectId(id)};
         const updatedDoc = {
           $set:{
             role : 'professionals'
            }
          };
          const result = await Users_Collection.updateOne(filter,updatedDoc);
          res.send(result)
        })
        
    //  as user  control professionals role 
     app.get('/users/professionals/:email' , verifyToken, verifyProfessionals, async(req,res)=>{
         const email = req.params.email;
       
         if(email !== req.decoded.email){
           res.status(403).send({message: 'forbiden professionals access'})
             return;
            }
            const query = {email: email};
            const user = await Users_Collection.findOne(query);
            let professionals = false;
            if(user){
              console.log(user)
            professionals = user?.role === 'professionals'
          }
          else{
            return res.status(403).send({message:'professionals user not match'})
          }
          res.send({professionals})
        })
        
        
        

    app.delete('/users/:id', verifyToken,  async(req,res)=>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)};
      const result = await Users_Collection.deleteOne(query)
      res.send(result)
    })
    
    app.post('/users',async(req,res)=>{
      const cursor = req.body;
      const email = {email:cursor.email}
      const isUserExist = await Users_Collection.findOne(email);
      if(isUserExist){
        return res.send({message:'user alredy exist in db ',insertedId:null})
      }
      const result = await Users_Collection.insertOne(cursor)
      res.send(result)
    })
    
    
    
    // camp part 
    app.get('/camp', async(req,res)=>{
       const result = await Camp_Collection.find().toArray();
       res.send(result)
    })
    
    app.get('/camp/:id', async(req,res)=>{
       const id = req.params.id;
      //  const cursor = {_id: (id)}
        const cursor = {_id: new ObjectId(id)}
       console.log(cursor)
       const result = await Camp_Collection.findOne(cursor)
       res.send(result)
    })

    
    app.post('/camp', verifyToken, async(req,res)=>{
       const cursor = req.body;
       const result = await Camp_Collection.insertOne(cursor)
       res.send(result)
    })
    app.delete('/camp/:id', verifyToken,  async(req,res)=>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)};
      const result = await Camp_Collection.deleteOne(query)
      res.send(result)
    })


    app.patch('/camp/:id', async (req, res) => {
      const cursor = req.body;
      const id = req.params.id;
      console.log(cursor)
      const query = {_id: (id)};
      // const query = { _id: new ObjectId(id) }
      const updatedDoc = {
        $set: {
           campname:cursor.campname, 
           campfee: cursor.campfee,
           venuelocation:cursor.venuelocation,
           description:cursor.description,
           details:cursor.details, 
           healthcareProfessionals:cursor.healthcareProfessionals,
           specializedservices:cursor.specializedservices,  
           targetaudience:cursor.targetaudience, 
           scheduleddatetime:cursor.scheduleddatetime, 
           image: cursor.image,
           camprole: cursor.camprole,
           participant: cursor.participant + 1,
        },
      }
      const result = await Camp_Collection.updateOne(query,updatedDoc);
      res.send(result);
    })

  
    app.patch('/camp/perticipentCount/:id', async (req, res) => {
      const cursor = req.body;
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          participant: parseFloat(cursor?.participant) + 1,
        },
      };
      const result = await Camp_Collection.updateOne(query, updatedDoc);
      res.send(result);
    });

    app.patch('/camp/professionals/:id', async (req, res) => {
      const cursor = req.body;
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          professionals: parseFloat(cursor?.professionals) + 1,
        },
      };
      const result = await Camp_Collection.updateOne(query, updatedDoc);
      res.send(result);
    });
    

  


     //registerdCamp part
     app.get('/registerdCamp', async(req,res)=>{
      const result = await RegisterdCamp_Collection.find().toArray();
      res.send(result)
   })

  //  app.post('/registerdCamp', verifyToken, async(req,res)=>{
   app.post('/registerdCamp', async(req,res)=>{
      const cursor = req.body;
      const result = await RegisterdCamp_Collection.insertOne(cursor)
      res.send(result)
   })
   
   app.get('/registerdCamp/:id', async(req,res)=>{
      const id = req.params.id;
      const cursor = {_id: new ObjectId(id)}
      const result = await RegisterdCamp_Collection.findOne(cursor)
      res.send(result)
   })
   
   app.delete('/registerdCamp/:id',  async(req,res)=>{
    const id = req.params.id;
    console.log(id)
    const query = {_id: new ObjectId(id)};
    const result = await RegisterdCamp_Collection.deleteOne(query)
    res.send(result)
  })




  // reviews part 
  app.get('/reviews', async(req,res)=>{
    const result = await UserReviews_Collection.find().toArray();
    res.send(result)
 })
 app.post('/reviews', async(req,res)=>{
  const cursor = req.body;
  const result = await UserReviews_Collection.insertOne(cursor)
  res.send(result)
})
 


// payment colection for use payment to get admin or ogganizer

    // payment intent
    app.post('/create-payment-intent',async(req,res)=>{
      const {fee} = req.body;
      const amount = parseInt(fee*100);
    
      const paymentIntent = await stripe.paymentIntents.create({
           amount : amount,
           currency : 'usd',
           payment_method_types: ['card']
      })
      res.send({
          clientSecret : paymentIntent.client_secret
        })
    })

    // payment history saved and delete Camp 
    app.post('/payment',async(req,res)=>{
      const payment = req.body;
      console.log(payment);
      const paymentResult = await Payment_Collection.insertOne(payment);

      // delete my added registerdCamp by ids from RegisterdCamp collection
      const query = {_id:{
        $in: payment?.regsiterdCampIds?.map(id=> new ObjectId(id))
      }}
      const deleteResult = await RegisterdCamp_Collection.deleteMany(query)

      res.send({paymentResult,deleteResult})
    }) 

    //  for payment history by specific emial user
    app.get('/payment/:email',verifyToken,  async(req,res)=>{
        const query = req.params.email;
        if(req.params.email !== req.decoded.email){
          return res.status(403).send({message:'forbidden status man'})
        }
        const result = await Payment_Collection.find({email:query}).toArray();
        res.send(result)
    })

    app.get('/payment',  async(req,res)=>{
        const result = await Payment_Collection.find().toArray();
        res.send(result)
    })

    app.patch('/payment/:id', verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const updatedDoc = {
          $set: {
              status: 'Confirmed',
          }
      };
      const result = await Payment_Collection.updateOne(query, updatedDoc);
      res.send(result);
  });
  

    
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
      // await client.close();
    }  
  
}  
run().catch(console.dir);


app.get('/',async(req,res)=>{
    res.send('UNIFIED CARENET SERVER IS WORKING ON HER WAY')
})
app.listen(port,()=>{
    console.log(port,'is running')
})