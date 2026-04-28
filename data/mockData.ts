export interface CafeHours {
  openNow: boolean;
  currentHours?: string; // e.g., "Open Now 3:30pm - 7:30pm"
  weeklyHours?: any; // Full weekly schedule from Google Places
}

export interface Cafe {
  id: string;
  name: string;
  location: string;
  rating: number;
  image: string;
  description: string;
  reviews: Review[];
  phone?: string;
  hours?: CafeHours;
  amenities?: string[]; // e.g., ["Has WiFi", "Parking", "Top Rated"]
  favoritesCount?: number;
  savedCount?: number;
  photos?: string[]; // Array of photo URLs
  place_id?: string; // Google Places ID
}

export interface Review {
  id: string;
  userName: string;
  userImage: string;
  rating: number;
  text: string;
  orderedItem?: string;
  date: string;
  attributes?: string[];
  photos?: string[];
}

export interface UserReview {
  id: string;
  cafeImage: string;
  cafeName: string;
  cafeId: string;
  cafePlaceId?: string;
  rating: number;
  date: string;
  text: string;
  orderedItem?: string;
  attributes?: string[];
  photos?: string[];
}

export const cafes: Cafe[] = [
  {
    id: '1',
    name: 'Coffee Pen',
    location: '6 Basque Road, Eden Terrace, Auckland',
    rating: 4.7,
    image: 'https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg?auto=compress&cs=tinysrgb&w=800',
    description: 'A specialty coffee roastery and cafe known for their exceptional single-origin beans and expertly crafted brews. Located in the heart of Eden Terrace, Coffee Pen offers a cozy atmosphere perfect for coffee enthusiasts.',
    phone: '09 123 4567',
    hours: {
      openNow: true,
      currentHours: 'Open Now 7:00am - 4:00pm'
    },
    amenities: ['Has WiFi', 'Top Rated'],
    favoritesCount: 12,
    savedCount: 8,
    photos: [
      'https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/1833399/pexels-photo-1833399.jpeg?auto=compress&cs=tinysrgb&w=800'
    ],
    reviews: [
      {
        id: '1',
        userName: 'Emma Wilson',
        userImage: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
        rating: 5,
        text: 'Absolutely incredible coffee! The baristas really know their craft and the single-origin beans are exceptional. Best flat white in Auckland!',
        date: '2 days ago'
      },
      {
        id: '2',
        userName: 'James Chen',
        userImage: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
        rating: 5,
        text: 'Coffee Pen never disappoints. Great atmosphere, friendly staff, and consistently amazing coffee. The pour-over is a must-try!',
        date: '1 week ago'
      }
    ]
  },
  {
    id: '2',
    name: 'Chuffed',
    location: 'High Street, Auckland CBD',
    rating: 4.6,
    image: 'https://images.pexels.com/photos/1833399/pexels-photo-1833399.jpeg?auto=compress&cs=tinysrgb&w=800',
    description: 'A vibrant cafe in the heart of Auckland CBD, Chuffed is known for their innovative coffee blends and delicious brunch menu. The perfect spot for business meetings or catching up with friends.',
    reviews: [
      {
        id: '3',
        userName: 'Sarah Johnson',
        userImage: 'https://images.pexels.com/photos/1181686/pexels-photo-1181686.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
        rating: 5,
        text: 'Love the vibe at Chuffed! Great coffee and the avocado toast is to die for. Perfect location in the CBD.',
        date: '3 days ago'
      },
      {
        id: '4',
        userName: 'Michael Rodriguez',
        userImage: 'https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
        rating: 4,
        text: 'Solid coffee and great service. Can get busy during lunch hours but worth the wait. The cold brew is excellent.',
        date: '5 days ago'
      }
    ]
  },
  {
    id: '3',
    name: 'Remedy Coffee',
    location: '108 Sunnybrae Road, Hillcrest, Auckland 0627',
    rating: 4.6,
    image: 'https://images.pexels.com/photos/1307698/pexels-photo-1307698.jpeg?auto=compress&cs=tinysrgb&w=800',
    description: 'Remedy Coffee is a local favorite known for their commitment to quality and sustainability. They source their beans directly from farmers and roast them to perfection, creating a truly exceptional coffee experience.',
    phone: '09 482 2340',
    hours: {
      openNow: true,
      currentHours: 'Open Now 3:30pm - 7:30pm'
    },
    amenities: ['Has WiFi', 'Top Rated'],
    favoritesCount: 12,
    savedCount: 12,
    photos: [
      'https://images.pexels.com/photos/1307698/pexels-photo-1307698.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/1833399/pexels-photo-1833399.jpeg?auto=compress&cs=tinysrgb&w=800'
    ],
    reviews: [
      {
        id: '5',
        userName: 'Lisa Park',
        userImage: 'https://images.pexels.com/photos/1181424/pexels-photo-1181424.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
        rating: 5,
        text: 'Remedy Coffee is my go-to spot! The ethical sourcing and quality of their beans really shows in every cup. Highly recommend!',
        date: '1 week ago'
      },
      {
        id: '6',
        userName: 'David Kim',
        userImage: 'https://images.pexels.com/photos/1040880/pexels-photo-1040880.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
        rating: 4,
        text: 'Great coffee with a conscience. Love supporting their direct trade initiatives. The cappuccino is perfectly balanced.',
        date: '4 days ago'
      },
      {
        id: 'r1',
        userName: 'Sarah Johnson',
        userImage: 'https://images.pexels.com/photos/1181686/pexels-photo-1181686.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
        rating: 5,
        text: 'Absolutely amazing coffee! Best flat white in Auckland.',
        date: '2 days ago'
      },
      {
        id: 'r2',
        userName: 'Michael Brown',
        userImage: 'https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
        rating: 5,
        text: 'Perfect spot for a morning coffee. Staff are always friendly!',
        date: '3 days ago'
      },
      {
        id: 'r3',
        userName: 'Emma Wilson',
        userImage: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
        rating: 5,
        text: 'Love the atmosphere here. Coffee is consistently excellent.',
        date: '5 days ago'
      },
      {
        id: 'r4',
        userName: 'James Chen',
        userImage: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
        rating: 5,
        text: 'Top quality beans and expert baristas. Highly recommended!',
        date: '1 week ago'
      },
      {
        id: 'r5',
        userName: 'Olivia Martinez',
        userImage: 'https://images.pexels.com/photos/1181424/pexels-photo-1181424.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
        rating: 5,
        text: 'My favorite coffee shop! The pour-over is incredible.',
        date: '6 days ago'
      },
      {
        id: 'r6',
        userName: 'Robert Taylor',
        userImage: 'https://images.pexels.com/photos/1040880/pexels-photo-1040880.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
        rating: 5,
        text: 'Great coffee and excellent service. Will definitely be back!',
        date: '4 days ago'
      },
      {
        id: 'r7',
        userName: 'Sophie Anderson',
        userImage: 'https://images.pexels.com/photos/1181686/pexels-photo-1181686.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
        rating: 5,
        text: 'Amazing coffee experience. The single-origin beans are fantastic!',
        date: '2 weeks ago'
      },
      {
        id: 'r8',
        userName: 'Tom Williams',
        userImage: 'https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
        rating: 5,
        text: 'Best coffee in Hillcrest! Quality is always top-notch.',
        date: '1 week ago'
      },
      {
        id: 'r9',
        userName: 'Rachel Green',
        userImage: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
        rating: 5,
        text: 'Perfect coffee spot. Love the sustainable approach!',
        date: '5 days ago'
      },
      {
        id: 'r10',
        userName: 'Chris Thompson',
        userImage: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
        rating: 5,
        text: 'Excellent coffee and great vibes. Highly recommend!',
        date: '3 days ago'
      },
      {
        id: 'r11',
        userName: 'Amanda Lee',
        userImage: 'https://images.pexels.com/photos/1181424/pexels-photo-1181424.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
        rating: 5,
        text: 'My go-to coffee place. Always consistent quality!',
        date: '1 week ago'
      },
      {
        id: 'r12',
        userName: 'Daniel White',
        userImage: 'https://images.pexels.com/photos/1040880/pexels-photo-1040880.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
        rating: 5,
        text: 'Fantastic coffee and friendly staff. Love it here!',
        date: '4 days ago'
      },
      {
        id: 'r13',
        userName: 'Jessica Brown',
        userImage: 'https://images.pexels.com/photos/1181686/pexels-photo-1181686.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
        rating: 5,
        text: 'Best coffee shop around! Quality is unmatched.',
        date: '6 days ago'
      },
      {
        id: 'r14',
        userName: 'Mark Davis',
        userImage: 'https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
        rating: 5,
        text: 'Amazing coffee experience every time. Highly recommended!',
        date: '2 weeks ago'
      },
      {
        id: 'r15',
        userName: 'Laura Wilson',
        userImage: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
        rating: 5,
        text: 'Perfect spot for coffee lovers. Quality is exceptional!',
        date: '1 week ago'
      },
      {
        id: 'r16',
        userName: 'Kevin Moore',
        userImage: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
        rating: 5,
        text: 'Great coffee and atmosphere. Will be back soon!',
        date: '5 days ago'
      },
      {
        id: 'r17',
        userName: 'Nicole Taylor',
        userImage: 'https://images.pexels.com/photos/1181424/pexels-photo-1181424.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
        rating: 5,
        text: 'Love the ethical sourcing. Coffee tastes amazing!',
        date: '3 days ago'
      },
      {
        id: 'r18',
        userName: 'Ryan Johnson',
        userImage: 'https://images.pexels.com/photos/1040880/pexels-photo-1040880.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
        rating: 5,
        text: 'Best coffee in the area. Quality is always top-notch!',
        date: '1 week ago'
      },
      {
        id: 'r19',
        userName: 'Michelle Chen',
        userImage: 'https://images.pexels.com/photos/1181686/pexels-photo-1181686.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
        rating: 5,
        text: 'Excellent coffee and service. Highly recommend!',
        date: '4 days ago'
      },
      {
        id: 'r20',
        userName: 'Alex Rodriguez',
        userImage: 'https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
        rating: 5,
        text: 'Perfect coffee spot. Love coming here!',
        date: '6 days ago'
      },
      {
        id: 'r21',
        userName: 'Jennifer Smith',
        userImage: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
        rating: 5,
        text: 'Amazing coffee experience. Quality is unmatched!',
        date: '2 weeks ago'
      },
      {
        id: 'r22',
        userName: 'Brian Lee',
        userImage: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
        rating: 5,
        text: 'Best coffee shop around. Highly recommended!',
        date: '1 week ago'
      },
      {
        id: 'r23',
        userName: 'Stephanie Brown',
        userImage: 'https://images.pexels.com/photos/1181424/pexels-photo-1181424.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
        rating: 5,
        text: 'Love the coffee here. Always consistent quality!',
        date: '5 days ago'
      },
      {
        id: 'r24',
        userName: 'Jason White',
        userImage: 'https://images.pexels.com/photos/1040880/pexels-photo-1040880.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
        rating: 5,
        text: 'Perfect spot for coffee. Quality is exceptional!',
        date: '3 days ago'
      },
      {
        id: 'r25',
        userName: 'Melissa Davis',
        userImage: 'https://images.pexels.com/photos/1181686/pexels-photo-1181686.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
        rating: 5,
        text: 'Great coffee and friendly staff. Will be back!',
        date: '1 week ago'
      },
      {
        id: 'r26',
        userName: 'Patrick Moore',
        userImage: 'https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
        rating: 5,
        text: 'Amazing coffee experience. Highly recommend!',
        date: '4 days ago'
      },
      {
        id: 'r27',
        userName: 'Catherine Wilson',
        userImage: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
        rating: 5,
        text: 'Best coffee in Hillcrest! Quality is always top-notch.',
        date: '6 days ago'
      },
      {
        id: 'r28',
        userName: 'Andrew Taylor',
        userImage: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
        rating: 5,
        text: 'Perfect coffee spot. Love coming here!',
        date: '2 weeks ago'
      },
      {
        id: 'r29',
        userName: 'Rebecca Johnson',
        userImage: 'https://images.pexels.com/photos/1181424/pexels-photo-1181424.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
        rating: 5,
        text: 'Excellent coffee and service. Highly recommended!',
        date: '1 week ago'
      },
      {
        id: 'r30',
        userName: 'Jonathan Chen',
        userImage: 'https://images.pexels.com/photos/1040880/pexels-photo-1040880.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
        rating: 5,
        text: 'Love the ethical sourcing. Coffee tastes amazing!',
        date: '5 days ago'
      },
      {
        id: 'r31',
        userName: 'Emily Rodriguez',
        userImage: 'https://images.pexels.com/photos/1181686/pexels-photo-1181686.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
        rating: 4,
        text: 'Good coffee and nice atmosphere. Would recommend!',
        date: '3 days ago'
      },
      {
        id: 'r32',
        userName: 'Matthew Smith',
        userImage: 'https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
        rating: 4,
        text: 'Solid coffee spot. Quality is good!',
        date: '1 week ago'
      },
      {
        id: 'r33',
        userName: 'Ashley Lee',
        userImage: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
        rating: 4,
        text: 'Nice coffee shop. Enjoyed my visit!',
        date: '4 days ago'
      },
      {
        id: 'r34',
        userName: 'Brandon Brown',
        userImage: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
        rating: 4,
        text: 'Good coffee and friendly service. Will return!',
        date: '6 days ago'
      },
      {
        id: 'r35',
        userName: 'Samantha White',
        userImage: 'https://images.pexels.com/photos/1181424/pexels-photo-1181424.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
        rating: 4,
        text: 'Decent coffee spot. Atmosphere is nice!',
        date: '2 weeks ago'
      },
      {
        id: 'r36',
        userName: 'Tyler Davis',
        userImage: 'https://images.pexels.com/photos/1040880/pexels-photo-1040880.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
        rating: 4,
        text: 'Good coffee. Staff are helpful!',
        date: '1 week ago'
      },
      {
        id: 'r37',
        userName: 'Lauren Moore',
        userImage: 'https://images.pexels.com/photos/1181686/pexels-photo-1181686.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
        rating: 3,
        text: 'Coffee was okay. Nothing special.',
        date: '5 days ago'
      },
      {
        id: 'r38',
        userName: 'Justin Wilson',
        userImage: 'https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
        rating: 3,
        text: 'Average coffee. Could be better.',
        date: '3 days ago'
      },
      {
        id: 'r39',
        userName: 'Megan Taylor',
        userImage: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
        rating: 2,
        text: 'Not impressed. Coffee was weak.',
        date: '1 week ago'
      },
      {
        id: 'r40',
        userName: 'Nathan Johnson',
        userImage: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
        rating: 1,
        text: 'Disappointing experience. Coffee was cold.',
        date: '4 days ago'
      }
    ]
  },
  {
    id: '4',
    name: 'Takapuna Beach Cafe',
    location: 'Takapuna, Auckland',
    rating: 4.5,
    image: 'https://images.pexels.com/photos/1251175/pexels-photo-1251175.jpeg?auto=compress&cs=tinysrgb&w=800',
    description: 'Located near the beautiful Takapuna Beach, this cafe offers stunning views alongside exceptional coffee. The perfect spot to relax and enjoy a leisurely coffee while taking in the coastal atmosphere.',
    reviews: [
      {
        id: '7',
        userName: 'Anna Thompson',
        userImage: 'https://images.pexels.com/photos/1181686/pexels-photo-1181686.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
        rating: 5,
        text: 'Amazing location with beautiful beach views! The coffee is excellent and the staff are so friendly. Perfect weekend spot.',
        date: '6 days ago'
      }
    ]
  },
  {
    id: '5',
    name: 'Odettes Eatery',
    location: 'Auckland Central',
    rating: 4.5,
    image: 'https://images.pexels.com/photos/1833399/pexels-photo-1833399.jpeg?auto=compress&cs=tinysrgb&w=800',
    description: 'Odettes Eatery combines excellent coffee with a fantastic food menu. Known for their artisanal approach to both coffee and cuisine, making it a favorite among Auckland foodies.',
    reviews: [
      {
        id: '8',
        userName: 'Robert Martinez',
        userImage: 'https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
        rating: 4,
        text: 'Great combination of excellent coffee and delicious food. The eggs benedict is outstanding and the coffee is top-notch.',
        date: '1 week ago'
      }
    ]
  },
  {
    id: '6',
    name: 'Bestie Cafe',
    location: 'Shop 13/183 Karangahape Road, Auckland CBD',
    rating: 4.4,
    image: 'https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg?auto=compress&cs=tinysrgb&w=800',
    description: 'A trendy cafe on the iconic K Road, Bestie Cafe is known for its hip atmosphere and consistently good coffee. Popular with locals and visitors alike, offering a true Auckland cafe experience.',
    reviews: [
      {
        id: '9',
        userName: 'Sophie Williams',
        userImage: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
        rating: 4,
        text: 'Love the K Road vibe at Bestie! Great coffee and the atmosphere is always buzzing. Perfect for people watching.',
        date: '3 days ago'
      }
    ]
  },
  {
    id: '7',
    name: 'MELBA Vulcan',
    location: '2.8 km from Auckland Central',
    rating: 4.4,
    image: 'https://images.pexels.com/photos/1307698/pexels-photo-1307698.jpeg?auto=compress&cs=tinysrgb&w=800',
    description: 'MELBA Vulcan offers a sophisticated coffee experience with their carefully curated selection of beans and expert brewing techniques. A favorite among coffee connoisseurs in Auckland.',
    reviews: [
      {
        id: '10',
        userName: 'Tom Anderson',
        userImage: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
        rating: 5,
        text: 'MELBA consistently delivers exceptional coffee. The attention to detail in their brewing process really shows. Highly recommended!',
        date: '2 days ago'
      }
    ]
  },
  {
    id: '8',
    name: 'Rad Cafe',
    location: 'Auckland Central',
    rating: 4.3,
    image: 'https://images.pexels.com/photos/1251175/pexels-photo-1251175.jpeg?auto=compress&cs=tinysrgb&w=800',
    description: 'True to its name, Rad Cafe brings a cool, laid-back vibe to Auckland\'s coffee scene. Known for their creative coffee drinks and welcoming atmosphere that keeps customers coming back.',
    reviews: [
      {
        id: '11',
        userName: 'Jessica Brown',
        userImage: 'https://images.pexels.com/photos/1181424/pexels-photo-1181424.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
        rating: 4,
        text: 'Rad Cafe lives up to its name! Chill atmosphere and really good coffee. The iced coffee is perfect for summer days.',
        date: '5 days ago'
      }
    ]
  },
  {
    id: '9',
    name: 'The Shelf',
    location: '50 High St, Auckland Central',
    rating: 4.2,
    image: 'https://images.pexels.com/photos/1833399/pexels-photo-1833399.jpeg?auto=compress&cs=tinysrgb&w=800',
    description: 'The Shelf is a cozy bookstore cafe that combines the love of literature with great coffee. Browse books while enjoying expertly crafted coffee in this unique Auckland gem.',
    reviews: [
      {
        id: '12',
        userName: 'Mark Thompson',
        userImage: 'https://images.pexels.com/photos/1040880/pexels-photo-1040880.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
        rating: 4,
        text: 'Love the concept of a bookstore cafe! Great place to spend a quiet afternoon with a good book and excellent coffee.',
        date: '1 week ago'
      }
    ]
  },
  {
    id: '10',
    name: 'Dizengoff',
    location: 'Auckland Central',
    rating: 4.1,
    image: 'https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg?auto=compress&cs=tinysrgb&w=800',
    description: 'Dizengoff brings a touch of international flair to Auckland\'s coffee scene. Known for their unique coffee preparations and warm, welcoming service that makes every visit special.',
    reviews: [
      {
        id: '13',
        userName: 'Rachel Green',
        userImage: 'https://images.pexels.com/photos/1181686/pexels-photo-1181686.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
        rating: 4,
        text: 'Dizengoff has a unique charm and the coffee is consistently good. The staff are always friendly and welcoming.',
        date: '4 days ago'
      }
    ]
  }
];

export const userReviews: UserReview[] = [
  {
    id: '1',
    cafeImage: 'https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg?auto=compress&cs=tinysrgb&w=200',
    cafeName: 'Coffee Pen',
    rating: 5,
    date: '6 October',
    text: 'Absolutely incredible coffee! The baristas really know their craft and the single-origin beans are exceptional.',
    attributes: ['Ambient', 'Ethical']
  },
  {
    id: '2',
    cafeImage: 'https://images.pexels.com/photos/1833399/pexels-photo-1833399.jpeg?auto=compress&cs=tinysrgb&w=200',
    cafeName: 'Chuffed',
    rating: 4,
    date: '3 October',
    text: 'Love the vibe at Chuffed! Great coffee and the avocado toast is to die for. Perfect location in the CBD.',
    attributes: ['Ambient']
  },
  {
    id: '3',
    cafeImage: 'https://images.pexels.com/photos/1307698/pexels-photo-1307698.jpeg?auto=compress&cs=tinysrgb&w=200',
    cafeName: 'Remedy Coffee',
    rating: 5,
    date: '2 October',
    text: 'Remedy Coffee is my go-to spot! The ethical sourcing and quality of their beans really shows in every cup.',
    attributes: ['Ethical', 'Top Rated']
  },
  {
    id: '4',
    cafeImage: 'https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg?auto=compress&cs=tinysrgb&w=200',
    cafeName: 'Remedy Coffee',
    rating: 5,
    date: '1 October',
    text: 'Another great visit!',
    attributes: ['Ambient', 'Ethical', 'Top Rated', 'WiFi']
  },
  {
    id: '5',
    cafeImage: 'https://images.pexels.com/photos/1833399/pexels-photo-1833399.jpeg?auto=compress&cs=tinysrgb&w=200',
    cafeName: 'Remedy Coffee',
    rating: 5,
    date: '29 September',
    text: 'Perfect coffee as always.',
    attributes: ['Ethical']
  },
  {
    id: '6',
    cafeImage: 'https://images.pexels.com/photos/1307698/pexels-photo-1307698.jpeg?auto=compress&cs=tinysrgb&w=200',
    cafeName: 'Remedy Coffee',
    rating: 5,
    date: '22 September',
    text: 'Love this place!',
    attributes: ['Ambient']
  },
  {
    id: '7',
    cafeImage: 'https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg?auto=compress&cs=tinysrgb&w=200',
    cafeName: 'Remedy Coffee',
    rating: 5,
    date: '16 September',
    text: 'Great atmosphere!',
    attributes: ['Ethical', 'Top Rated']
  },
  {
    id: '8',
    cafeImage: 'https://images.pexels.com/photos/1833399/pexels-photo-1833399.jpeg?auto=compress&cs=tinysrgb&w=200',
    cafeName: 'Remedy Coffee',
    rating: 5,
    date: '6 September',
    text: 'Amazing coffee!',
    attributes: ['Ambient', 'Ethical']
  }
];