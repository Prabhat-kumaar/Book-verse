const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const Book = require('../models/Book');
const Progress = require('../models/Progress');

const MONGODB_URI = process.env.MONGODB_URI;

// Clean up author name (e.g. "Austen, Jane" -> "Jane Austen")
function formatAuthorName(rawName) {
  if (!rawName) return 'Unknown Author';
  // Remove birth/death years like (1812-1870)
  let clean = rawName.replace(/\s*\(\d{1,4}\s*[-–]\s*\d{1,4}?\)/g, '').trim();
  clean = clean.replace(/,\s*Emperor of Rome|\s*Sir|\s*Lord/gi, '');
  
  if (clean.includes(',')) {
    const parts = clean.split(',').map((p) => p.trim());
    if (parts.length >= 2) {
      return `${parts[1]} ${parts[0]}`.trim();
    }
  }
  return clean || 'Unknown Author';
}

// Clean title
function formatTitle(rawTitle) {
  if (!rawTitle) return 'Untitled Manuscript';
  let clean = rawTitle.split(/\r\n|\n|;/)[0].trim();
  clean = clean.replace(/\s*:\s*A Novel$/i, '');
  clean = clean.replace(/\s*;\s*Or,\s*.+$/i, '');
  return clean.trim();
}

// Categorize book from subjects and title
function detectCategory(title = '', subjects = []) {
  const combined = (title + ' ' + subjects.join(' ')).toLowerCase();
  
  if (combined.includes('stoic') || combined.includes('philosophy') || combined.includes('ethics') || combined.includes('meditation') || combined.includes('moral') || combined.includes('plato') || combined.includes('aristotle') || combined.includes('nietzsche')) {
    return 'Philosophy';
  }
  if (combined.includes('self-help') || combined.includes('success') || combined.includes('wealth') || combined.includes('mind') || combined.includes('conduct of life') || combined.includes('habit') || combined.includes('positive thinking')) {
    return 'Self-Help';
  }
  if (combined.includes('science fiction') || combined.includes('space') || combined.includes('alien') || combined.includes('time travel') || combined.includes('dystopia') || combined.includes('cyber')) {
    return 'Science Fiction';
  }
  if (combined.includes('detective') || combined.includes('mystery') || combined.includes('holmes') || combined.includes('murder') || combined.includes('crime') || combined.includes('investigation')) {
    return 'Mystery';
  }
  if (combined.includes('horror') || combined.includes('ghost') || combined.includes('dracula') || combined.includes('vampire') || combined.includes('frankenstein') || combined.includes('cthulhu') || combined.includes('supernatural')) {
    return 'Horror';
  }
  if (combined.includes('business') || combined.includes('economy') || combined.includes('finance') || combined.includes('capital') || combined.includes('money') || combined.includes('commerce') || combined.includes('management')) {
    return 'Business';
  }
  if (combined.includes('science') || combined.includes('evolution') || combined.includes('physics') || combined.includes('relativity') || combined.includes('darwin') || combined.includes('astronomy') || combined.includes('math')) {
    return 'Science';
  }
  if (combined.includes('history') || combined.includes('historical') || combined.includes('war') || combined.includes('revolution') || combined.includes('rome') || combined.includes('greece') || combined.includes('empire')) {
    return 'History';
  }
  if (combined.includes('adventure') || combined.includes('sea') || combined.includes('voyage') || combined.includes('island') || combined.includes('pirate') || combined.includes('journey')) {
    return 'Adventure';
  }
  if (combined.includes('psychology') || combined.includes('psycho') || combined.includes('behavior') || combined.includes('consciousness')) {
    return 'Psychology';
  }
  if (combined.includes('fantasy') || combined.includes('magic') || combined.includes('fairy') || combined.includes('wizard') || combined.includes('wonderland') || combined.includes('myth')) {
    return 'Fantasy';
  }
  if (combined.includes('poetry') || combined.includes('poems') || combined.includes('poet') || combined.includes('verse')) {
    return 'Poetry';
  }
  if (combined.includes('drama') || combined.includes('plays') || combined.includes('tragedy') || combined.includes('theatre') || combined.includes('shakespeare')) {
    return 'Drama';
  }
  return 'Fiction';
}

// Generate realistic description
function buildDescription(title, author, category, subjects = []) {
  const topSubjects = subjects.slice(0, 3).join(', ');
  if (topSubjects) {
    return `An enduring masterpiece of ${category.toLowerCase()} by ${author}. Widely celebrated for its exploration of ${topSubjects.toLowerCase()}, this timeless work continues to inspire readers around the world.`;
  }
  return `A globally renowned literary classic in ${category} by ${author}. Celebrated across generations for its profound narrative, intellectual depth, and enduring impact.`;
}

// Curated top iconic masterpieces with guaranteed high-quality EPUB & covers
const ICONIC_CURATED_COLLECTION = [
  {
    title: 'Meditations',
    author: 'Marcus Aurelius',
    category: 'Philosophy',
    difficulty: 'Intermediate',
    tags: ['stoicism', 'philosophy', 'wisdom', 'mindset', 'leadership'],
    description: 'Written in Greek without any intention of publication by the Roman Emperor Marcus Aurelius, Meditations offers a remarkable series of challenging spiritual reflections and exercises developed as the emperor struggled to understand himself and make sense of the universe.',
    thumbnail: 'https://covers.openlibrary.org/b/id/12843437-L.jpg',
    fileUrl: 'https://www.gutenberg.org/ebooks/2680.epub3.images',
    fileType: 'epub',
    averageRating: 4.9,
    totalReviews: 1420,
  },
  {
    title: 'The Art of War',
    author: 'Sun Tzu',
    category: 'Philosophy',
    difficulty: 'Beginner',
    tags: ['strategy', 'leadership', 'tactics', 'warfare', 'philosophy'],
    description: 'Sun Tzu was an ancient Chinese general, military strategist, and philosopher. The Art of War is the definitive work on military strategy and tactics, influencing generals, politicians, and business leaders for over two millennia.',
    thumbnail: 'https://covers.openlibrary.org/b/id/12555307-L.jpg',
    fileUrl: 'https://www.gutenberg.org/ebooks/17405.epub3.images',
    fileType: 'epub',
    averageRating: 4.9,
    totalReviews: 1840,
  },
  {
    title: 'Think and Grow Rich',
    author: 'Napoleon Hill',
    category: 'Self-Help',
    difficulty: 'Beginner',
    tags: ['wealth', 'mindset', 'success', 'personal-development', 'finance'],
    description: 'Think and Grow Rich is a personal development and self-improvement book written by Napoleon Hill based on his interviews with 500 of the most successful individuals of his time, including Andrew Carnegie, Thomas Edison, and Henry Ford.',
    thumbnail: 'https://covers.openlibrary.org/b/id/12711684-L.jpg',
    fileUrl: 'https://www.gutenberg.org/ebooks/67704.epub3.images',
    fileType: 'epub',
    averageRating: 4.8,
    totalReviews: 2150,
  },
  {
    title: 'The Prince',
    author: 'Niccolò Machiavelli',
    category: 'Philosophy',
    difficulty: 'Intermediate',
    tags: ['politics', 'leadership', 'power', 'philosophy', 'history'],
    description: 'The Prince is a 16th-century political treatise written by Italian diplomat and political theorist Niccolò Machiavelli. An unyielding analysis of power, statecraft, and human nature that remains fundamental to political science.',
    thumbnail: 'https://covers.openlibrary.org/b/id/12739268-L.jpg',
    fileUrl: 'https://www.gutenberg.org/ebooks/1232.epub3.images',
    fileType: 'epub',
    averageRating: 4.7,
    totalReviews: 960,
  },
  {
    title: 'Tao Te Ching',
    author: 'Lao Tzu',
    category: 'Philosophy',
    difficulty: 'Beginner',
    tags: ['taoism', 'eastern-philosophy', 'spirituality', 'peace', 'wisdom'],
    description: 'The Tao Te Ching is an ancient Chinese classic text traditionally credited to the sage Laozi. Composed of 81 short chapters, it is a fundamental text for both philosophical and religious Taoism, teaching harmony with the fundamental nature of the universe.',
    thumbnail: 'https://covers.openlibrary.org/b/id/8372658-L.jpg',
    fileUrl: 'https://www.gutenberg.org/ebooks/216.epub3.images',
    fileType: 'epub',
    averageRating: 4.9,
    totalReviews: 1100,
  },
  {
    title: 'Beyond Good and Evil',
    author: 'Friedrich Nietzsche',
    category: 'Philosophy',
    difficulty: 'Advanced',
    tags: ['morality', 'philosophy', 'existentialism', 'nietzsche', 'truth'],
    description: 'In Beyond Good and Evil, Nietzsche accuses past philosophers of lacking critical sense and blindly accepting dogmatic premises in their consideration of morality. He moves through the virtues to reveal the will to power that underpins human thought.',
    thumbnail: 'https://covers.openlibrary.org/b/id/12586616-L.jpg',
    fileUrl: 'https://www.gutenberg.org/ebooks/4363.epub3.images',
    fileType: 'epub',
    averageRating: 4.7,
    totalReviews: 730,
  },
  {
    title: 'As a Man Thinketh',
    author: 'James Allen',
    category: 'Self-Help',
    difficulty: 'Beginner',
    tags: ['mindset', 'thought-power', 'success', 'inspiration', 'character'],
    description: 'As a Man Thinketh is a timeless literary essay by James Allen. It deals with the power of thought, and particularly with the use and application of thought to happy and beautiful issues.',
    thumbnail: 'https://covers.openlibrary.org/b/id/10543660-L.jpg',
    fileUrl: 'https://www.gutenberg.org/ebooks/4507.epub3.images',
    fileType: 'epub',
    averageRating: 4.8,
    totalReviews: 890,
  },
  {
    title: 'The Great Gatsby',
    author: 'F. Scott Fitzgerald',
    category: 'Fiction',
    difficulty: 'Intermediate',
    tags: ['jazz-age', 'american-dream', 'classics', 'tragedy', 'bestseller'],
    description: 'Set in the Jazz Age on Long Island, the novel depicts narrator Nick Carraway and his interactions with mysterious millionaire Jay Gatsby and Gatsby’s obsession to reunite with his former lover, Daisy Buchanan.',
    thumbnail: 'https://covers.openlibrary.org/b/id/12718919-L.jpg',
    fileUrl: 'https://www.gutenberg.org/ebooks/64317.epub3.images',
    fileType: 'epub',
    averageRating: 4.9,
    totalReviews: 2450,
  },
  {
    title: 'The Picture of Dorian Gray',
    author: 'Oscar Wilde',
    category: 'Fiction',
    difficulty: 'Intermediate',
    tags: ['gothic', 'aestheticism', 'morality', 'vanity', 'classic'],
    description: 'The story revolves around a portrait of Dorian Gray painted by Basil Hallward, which ages while Gray remains youthful. An incisive and haunting examination of youth, hedonism, and moral corruption.',
    thumbnail: 'https://covers.openlibrary.org/b/id/12836262-L.jpg',
    fileUrl: 'https://www.gutenberg.org/ebooks/174.epub3.images',
    fileType: 'epub',
    averageRating: 4.8,
    totalReviews: 1680,
  },
  {
    title: 'The Adventures of Sherlock Holmes',
    author: 'Arthur Conan Doyle',
    category: 'Mystery',
    difficulty: 'Beginner',
    tags: ['detective', 'mystery', 'sherlock', 'london', 'crime'],
    description: 'A collection of twelve short stories by Arthur Conan Doyle featuring his fictional detective Sherlock Holmes, investigating intriguing cases across Victorian London alongside Dr. John Watson.',
    thumbnail: 'https://covers.openlibrary.org/b/id/12822495-L.jpg',
    fileUrl: 'https://www.gutenberg.org/ebooks/1661.epub3.images',
    fileType: 'epub',
    averageRating: 4.9,
    totalReviews: 3100,
  },
  {
    title: 'Crime and Punishment',
    author: 'Fyodor Dostoevsky',
    category: 'Fiction',
    difficulty: 'Advanced',
    tags: ['psychology', 'russian-literature', 'guilt', 'morality', 'dostoevsky'],
    description: 'Focuses on the mental anguish and moral dilemmas of Rodion Raskolnikov, an impoverished ex-student in Saint Petersburg who plans to kill an unscrupulous pawnbroker to redistribute her wealth.',
    thumbnail: 'https://covers.openlibrary.org/b/id/12727142-L.jpg',
    fileUrl: 'https://www.gutenberg.org/ebooks/2554.epub3.images',
    fileType: 'epub',
    averageRating: 4.9,
    totalReviews: 2790,
  },
  {
    title: 'Pride and Prejudice',
    author: 'Jane Austen',
    category: 'Fiction',
    difficulty: 'Intermediate',
    tags: ['romance', 'society', 'classic', 'austen', 'humor'],
    description: 'The romantic clash between the opinionated Elizabeth Bennet and her proud beau, Mr. Fitzwilliam Darcy, in rural England. A brilliant masterpiece of wit, manners, and love.',
    thumbnail: 'https://covers.openlibrary.org/b/id/12646270-L.jpg',
    fileUrl: 'https://www.gutenberg.org/ebooks/1342.epub3.images',
    fileType: 'epub',
    averageRating: 4.9,
    totalReviews: 3600,
  },
  {
    title: 'Frankenstein',
    author: 'Mary Shelley',
    category: 'Horror',
    difficulty: 'Intermediate',
    tags: ['gothic', 'sci-fi', 'creation', 'monsters', 'classic'],
    description: 'Frankenstein tells the story of Victor Frankenstein, a young scientist who creates a sapient creature in an unorthodox scientific experiment, exploring themes of ambition, isolation, and responsibility.',
    thumbnail: 'https://covers.openlibrary.org/b/id/12720165-L.jpg',
    fileUrl: 'https://www.gutenberg.org/ebooks/84.epub3.images',
    fileType: 'epub',
    averageRating: 4.8,
    totalReviews: 2120,
  },
  {
    title: 'Dracula',
    author: 'Bram Stoker',
    category: 'Horror',
    difficulty: 'Intermediate',
    tags: ['vampire', 'gothic', 'horror', 'transylvania', 'classic'],
    description: 'The story of Count Dracula\'s attempt to move from Transylvania to England so that he may find new blood and spread the undead curse, and of the battle between Dracula and a small group of people led by Professor Abraham Van Helsing.',
    thumbnail: 'https://covers.openlibrary.org/b/id/12745344-L.jpg',
    fileUrl: 'https://www.gutenberg.org/ebooks/345.epub3.images',
    fileType: 'epub',
    averageRating: 4.8,
    totalReviews: 1890,
  },
  {
    title: 'The Metamorphosis',
    author: 'Franz Kafka',
    category: 'Fiction',
    difficulty: 'Intermediate',
    tags: ['existentialism', 'kafka', 'alienation', 'classic', 'surreal'],
    description: 'One morning, Gregor Samsa wakes up to find himself transformed into a monstrous insect-like creature. A profound and tragic examination of alienation and familial responsibility.',
    thumbnail: 'https://covers.openlibrary.org/b/id/12724490-L.jpg',
    fileUrl: 'https://www.gutenberg.org/ebooks/5200.epub3.images',
    fileType: 'epub',
    averageRating: 4.8,
    totalReviews: 1540,
  },
  {
    title: 'The Time Machine',
    author: 'H.G. Wells',
    category: 'Science Fiction',
    difficulty: 'Beginner',
    tags: ['time-travel', 'sci-fi', 'future', 'dystopia', 'classic'],
    description: 'A Victorian English time traveller travels into the far future to the year A.D. 802,701, where he encounters two distinct species: the peaceful Eloi and the subterranean, monstrous Morlocks.',
    thumbnail: 'https://covers.openlibrary.org/b/id/12719702-L.jpg',
    fileUrl: 'https://www.gutenberg.org/ebooks/35.epub3.images',
    fileType: 'epub',
    averageRating: 4.7,
    totalReviews: 1450,
  },
  {
    title: 'The War of the Worlds',
    author: 'H.G. Wells',
    category: 'Science Fiction',
    difficulty: 'Intermediate',
    tags: ['aliens', 'martian-invasion', 'sci-fi', 'classic', 'apocalypse'],
    description: 'One of the earliest stories to detail a conflict between mankind and an extraterrestrial race, depicting the catastrophic invasion of southern England by Martians equipped with advanced heat-rays and tripods.',
    thumbnail: 'https://covers.openlibrary.org/b/id/12721867-L.jpg',
    fileUrl: 'https://www.gutenberg.org/ebooks/36.epub3.images',
    fileType: 'epub',
    averageRating: 4.8,
    totalReviews: 1670,
  },
  {
    title: 'Journey to the Center of the Earth',
    author: 'Jules Verne',
    category: 'Adventure',
    difficulty: 'Beginner',
    tags: ['exploration', 'subterranean', 'adventure', 'sci-fi', 'verne'],
    description: 'German professor Otto Lidenbrock believes there are volcanic tubes reaching to the center of the earth. He, his nephew Axel, and their guide Hans descend into an Icelandic volcano on a fantastic voyage.',
    thumbnail: 'https://covers.openlibrary.org/b/id/12720935-L.jpg',
    fileUrl: 'https://www.gutenberg.org/ebooks/18857.epub3.images',
    fileType: 'epub',
    averageRating: 4.8,
    totalReviews: 1380,
  },
  {
    title: 'Twenty Thousand Leagues Under the Sea',
    author: 'Jules Verne',
    category: 'Adventure',
    difficulty: 'Intermediate',
    tags: ['submarine', 'captain-nemo', 'ocean', 'adventure', 'sci-fi'],
    description: 'Follows Professor Aronnax, his servant Conseil, and master harpooner Ned Land as they are captured by the enigmatic Captain Nemo aboard his futuristic submarine, the Nautilus, exploring oceanic wonders.',
    thumbnail: 'https://covers.openlibrary.org/b/id/12845899-L.jpg',
    fileUrl: 'https://www.gutenberg.org/ebooks/164.epub3.images',
    fileType: 'epub',
    averageRating: 4.8,
    totalReviews: 1950,
  },
  {
    title: 'A Tale of Two Cities',
    author: 'Charles Dickens',
    category: 'Historical Fiction',
    difficulty: 'Intermediate',
    tags: ['french-revolution', 'london', 'paris', 'dickens', 'sacrifice'],
    description: 'Set in London and Paris before and during the French Revolution, the novel tells the story of the French Doctor Manette, his 18-year-long imprisonment in the Bastille, and the self-sacrifice of Sydney Carton.',
    thumbnail: 'https://covers.openlibrary.org/b/id/12721115-L.jpg',
    fileUrl: 'https://www.gutenberg.org/ebooks/98.epub3.images',
    fileType: 'epub',
    averageRating: 4.8,
    totalReviews: 2200,
  },
  {
    title: 'Alice\'s Adventures in Wonderland',
    author: 'Lewis Carroll',
    category: 'Fantasy',
    difficulty: 'Beginner',
    tags: ['wonderland', 'fantasy', 'surreal', 'cheshire-cat', 'classic'],
    description: 'Follows young Alice as she falls down a rabbit hole into a subterranean fantasy world populated by peculiar, anthropomorphic creatures such as the White Rabbit, the Mad Hatter, and the Queen of Hearts.',
    thumbnail: 'https://covers.openlibrary.org/b/id/12718873-L.jpg',
    fileUrl: 'https://www.gutenberg.org/ebooks/11.epub3.images',
    fileType: 'epub',
    averageRating: 4.9,
    totalReviews: 2900,
  },
  {
    title: 'The Count of Monte Cristo',
    author: 'Alexandre Dumas',
    category: 'Adventure',
    difficulty: 'Advanced',
    tags: ['revenge', 'justice', 'france', 'treasure', 'classic'],
    description: 'The story takes place in France, Italy, and islands in the Mediterranean. It centres on a man who is wrongfully imprisoned, escapes from jail, acquires a fortune, and sets about exacting revenge on those responsible for his imprisonment.',
    thumbnail: 'https://covers.openlibrary.org/b/id/12726588-L.jpg',
    fileUrl: 'https://www.gutenberg.org/ebooks/1184.epub3.images',
    fileType: 'epub',
    averageRating: 5.0,
    totalReviews: 3800,
  },
  {
    title: 'Moby Dick',
    author: 'Herman Melville',
    category: 'Fiction',
    difficulty: 'Advanced',
    tags: ['whaling', 'obsession', 'captain-ahab', 'sea', 'classic'],
    description: 'The sailor Ishmael narrates the obsessive quest of Ahab, captain of the whaling ship Pequod, for revenge against Moby Dick, the giant white sperm whale that bit off Ahab\'s leg at the knee.',
    thumbnail: 'https://covers.openlibrary.org/b/id/12725345-L.jpg',
    fileUrl: 'https://www.gutenberg.org/ebooks/2701.epub3.images',
    fileType: 'epub',
    averageRating: 4.7,
    totalReviews: 2310,
  },
  {
    title: 'The Strange Case of Dr. Jekyll and Mr. Hyde',
    author: 'Robert Louis Stevenson',
    category: 'Horror',
    difficulty: 'Beginner',
    tags: ['dual-personality', 'victorian', 'science', 'gothic', 'classic'],
    description: 'It is about a London legal practitioner named Gabriel John Utterson who investigates strange occurrences between his old friend, Dr. Henry Jekyll, and the evil Edward Hyde.',
    thumbnail: 'https://covers.openlibrary.org/b/id/12719266-L.jpg',
    fileUrl: 'https://www.gutenberg.org/ebooks/43.epub3.images',
    fileType: 'epub',
    averageRating: 4.8,
    totalReviews: 1840,
  },
  {
    title: 'The Republic',
    author: 'Plato',
    category: 'Philosophy',
    difficulty: 'Advanced',
    tags: ['justice', 'socrates', 'allegory-of-cave', 'philosophy', 'politics'],
    description: 'Plato\'s best-known work and one of the world\'s most influential works of philosophy and political theory, examining the nature of justice and the order and character of the just city-state and the just man.',
    thumbnail: 'https://covers.openlibrary.org/b/id/12745340-L.jpg',
    fileUrl: 'https://www.gutenberg.org/ebooks/1497.epub3.images',
    fileType: 'epub',
    averageRating: 4.8,
    totalReviews: 1420,
  },
  {
    title: 'The Prophet',
    author: 'Kahlil Gibran',
    category: 'Philosophy',
    difficulty: 'Beginner',
    tags: ['wisdom', 'poetry', 'life', 'love', 'spiritual'],
    description: 'Composed of 26 poetic essays covering topics such as love, marriage, children, giving, eating and drinking, work, joy and sorrow, houses, clothes, and death. One of the most translated books in history.',
    thumbnail: 'https://covers.openlibrary.org/b/id/12836268-L.jpg',
    fileUrl: 'https://www.gutenberg.org/ebooks/58585.epub3.images',
    fileType: 'epub',
    averageRating: 4.9,
    totalReviews: 1980,
  },
  {
    title: 'Treasure Island',
    author: 'Robert Louis Stevenson',
    category: 'Adventure',
    difficulty: 'Beginner',
    tags: ['pirates', 'long-john-silver', 'buried-treasure', 'adventure'],
    description: 'An adventure novel narrating a tale of buccaneers and buried gold. It is traditionally considered a coming-of-age story and is noted for its atmosphere, characters, and action.',
    thumbnail: 'https://covers.openlibrary.org/b/id/12719945-L.jpg',
    fileUrl: 'https://www.gutenberg.org/ebooks/120.epub3.images',
    fileType: 'epub',
    averageRating: 4.8,
    totalReviews: 2100,
  },
  {
    title: 'The Call of the Wild',
    author: 'Jack London',
    category: 'Adventure',
    difficulty: 'Beginner',
    tags: ['dogs', 'yukon', 'gold-rush', 'nature', 'survival'],
    description: 'Set in Yukon, Canada, during the 1890s Klondike Gold Rush, when strong sled dogs were in high demand. The central character is Buck, a domesticated dog who reverts to a wild state in the Arctic.',
    thumbnail: 'https://covers.openlibrary.org/b/id/12720235-L.jpg',
    fileUrl: 'https://www.gutenberg.org/ebooks/215.epub3.images',
    fileType: 'epub',
    averageRating: 4.8,
    totalReviews: 1750,
  },
  {
    title: 'Wuthering Heights',
    author: 'Emily Brontë',
    category: 'Fiction',
    difficulty: 'Intermediate',
    tags: ['gothic', 'heathcliff', 'yorkshire', 'passion', 'classic'],
    description: 'The story of Heathcliff and Catherine Earnshaw on the windswept Yorkshire moors. A powerful and tempestuous masterpiece of love, revenge, and haunting drama.',
    thumbnail: 'https://covers.openlibrary.org/b/id/12720042-L.jpg',
    fileUrl: 'https://www.gutenberg.org/ebooks/768.epub3.images',
    fileType: 'epub',
    averageRating: 4.8,
    totalReviews: 2040,
  },
  {
    title: 'Jane Eyre',
    author: 'Charlotte Brontë',
    category: 'Fiction',
    difficulty: 'Intermediate',
    tags: ['gothic', 'romance', 'rochester', 'independence', 'classic'],
    description: 'Follows the experiences of its eponymous heroine, including her growth to adulthood and her love for Mr. Rochester, the brooding master of Thornfield Hall.',
    thumbnail: 'https://covers.openlibrary.org/b/id/12720195-L.jpg',
    fileUrl: 'https://www.gutenberg.org/ebooks/1260.epub3.images',
    fileType: 'epub',
    averageRating: 4.9,
    totalReviews: 2480,
  },
  {
    title: 'The Secret Garden',
    author: 'Frances Hodgson Burnett',
    category: 'Fiction',
    difficulty: 'Beginner',
    tags: ['garden', 'healing', 'nature', 'yorkshire', 'childhood'],
    description: 'Mary Lennox, a sour, unloved 10-year-old girl born in India, is orphaned and sent to Yorkshire to live with her reclusive uncle. She discovers a locked, hidden garden that changes her life.',
    thumbnail: 'https://covers.openlibrary.org/b/id/12723120-L.jpg',
    fileUrl: 'https://www.gutenberg.org/ebooks/113.epub3.images',
    fileType: 'epub',
    averageRating: 4.9,
    totalReviews: 1820,
  },
  {
    title: 'Peter Pan',
    author: 'J.M. Barrie',
    category: 'Fantasy',
    difficulty: 'Beginner',
    tags: ['neverland', 'fairy-tale', 'captain-hook', 'tinker-bell', 'classic'],
    description: 'The story of Peter Pan, a mischievous boy who can fly and never grows up, spending his never-ending childhood on the mythical island of Neverland leading the Lost Boys.',
    thumbnail: 'https://covers.openlibrary.org/b/id/12721010-L.jpg',
    fileUrl: 'https://www.gutenberg.org/ebooks/16.epub3.images',
    fileType: 'epub',
    averageRating: 4.8,
    totalReviews: 1620,
  },
  {
    title: 'The Wonderful Wizard of Oz',
    author: 'L. Frank Baum',
    category: 'Fantasy',
    difficulty: 'Beginner',
    tags: ['oz', 'dorothy', 'yellow-brick-road', 'magic', 'classic'],
    description: 'Chronicles the adventures of a young Kansas farm girl named Dorothy in the magical Land of Oz after she and her pet dog Toto are swept away from their home by a cyclone.',
    thumbnail: 'https://covers.openlibrary.org/b/id/12722045-L.jpg',
    fileUrl: 'https://www.gutenberg.org/ebooks/55.epub3.images',
    fileType: 'epub',
    averageRating: 4.8,
    totalReviews: 1910,
  },
  {
    title: 'On the Origin of Species',
    author: 'Charles Darwin',
    category: 'Science',
    difficulty: 'Advanced',
    tags: ['evolution', 'biology', 'natural-selection', 'science', 'nature'],
    description: 'Published in 1859, Darwin\'s landmark work introduced the scientific theory that populations evolve over generations through a process of natural selection, establishing evolutionary biology.',
    thumbnail: 'https://covers.openlibrary.org/b/id/12726055-L.jpg',
    fileUrl: 'https://www.gutenberg.org/ebooks/2009.epub3.images',
    fileType: 'epub',
    averageRating: 4.8,
    totalReviews: 1120,
  },
  {
    title: 'Relativity: The Special and General Theory',
    author: 'Albert Einstein',
    category: 'Science',
    difficulty: 'Advanced',
    tags: ['physics', 'relativity', 'einstein', 'spacetime', 'cosmos'],
    description: 'Albert Einstein\'s own accessible exposition of both the special and general theories of relativity for readers interested in the fundamental laws of physics and the structure of spacetime.',
    thumbnail: 'https://covers.openlibrary.org/b/id/12727180-L.jpg',
    fileUrl: 'https://www.gutenberg.org/ebooks/30155.epub3.images',
    fileType: 'epub',
    averageRating: 4.8,
    totalReviews: 980,
  },
  {
    title: 'The Jungle Book',
    author: 'Rudyard Kipling',
    category: 'Adventure',
    difficulty: 'Beginner',
    tags: ['mowgli', 'bagheera', 'baloo', 'jungle', 'fables'],
    description: 'A collection of stories by Rudyard Kipling. Most of the characters are animals such as Shere Khan the tiger and Baloo the bear, though a principal character is the boy or "man-cub" Mowgli.',
    thumbnail: 'https://covers.openlibrary.org/b/id/12721245-L.jpg',
    fileUrl: 'https://www.gutenberg.org/ebooks/236.epub3.images',
    fileType: 'epub',
    averageRating: 4.8,
    totalReviews: 1640,
  },
  {
    title: 'Heart of Darkness',
    author: 'Joseph Conrad',
    category: 'Fiction',
    difficulty: 'Advanced',
    tags: ['congo', 'kurtz', 'colonialism', 'human-nature', 'classic'],
    description: 'Follows Charles Marlow as he takes a journey up the Congo River in the heart of Africa to find the enigmatic ivory trader Kurtz, exploring the darkness of human nature and imperial excess.',
    thumbnail: 'https://covers.openlibrary.org/b/id/12720440-L.jpg',
    fileUrl: 'https://www.gutenberg.org/ebooks/219.epub3.images',
    fileType: 'epub',
    averageRating: 4.7,
    totalReviews: 1480,
  },
  {
    title: 'The Iliad',
    author: 'Homer',
    category: 'Poetry',
    difficulty: 'Advanced',
    tags: ['troy', 'achilles', 'epic-poetry', 'greece', 'mythology'],
    description: 'Set during the Trojan War, the ten-year siege of the city of Troy by a coalition of Mycenaean Greek states, detailing the wrath of Achilles and the heroic clashes of antiquity.',
    thumbnail: 'https://covers.openlibrary.org/b/id/12726190-L.jpg',
    fileUrl: 'https://www.gutenberg.org/ebooks/6130.epub3.images',
    fileType: 'epub',
    averageRating: 4.9,
    totalReviews: 1820,
  },
  {
    title: 'The Odyssey',
    author: 'Homer',
    category: 'Poetry',
    difficulty: 'Advanced',
    tags: ['odysseus', 'ithaca', 'monsters', 'voyage', 'epic-poetry'],
    description: 'Follows the Greek hero Odysseus, king of Ithaca, and his journey home after the fall of Troy. It takes Odysseus ten eventful years to reach Ithaca after the ten-year Trojan War.',
    thumbnail: 'https://covers.openlibrary.org/b/id/12725140-L.jpg',
    fileUrl: 'https://www.gutenberg.org/ebooks/1727.epub3.images',
    fileType: 'epub',
    averageRating: 4.9,
    totalReviews: 2100,
  },
  {
    title: 'The Invisible Man',
    author: 'H.G. Wells',
    category: 'Science Fiction',
    difficulty: 'Beginner',
    tags: ['invisibility', 'mad-scientist', 'sci-fi', 'wells', 'classic'],
    description: 'Tells the story of Griffin, a scientist who has devoted himself to research into optics and who invents a way to change a body\'s refractive index to that of air so that it neither absorbs nor reflects light.',
    thumbnail: 'https://covers.openlibrary.org/b/id/12720180-L.jpg',
    fileUrl: 'https://www.gutenberg.org/ebooks/5230.epub3.images',
    fileType: 'epub',
    averageRating: 4.7,
    totalReviews: 1340,
  },
  {
    title: 'The Island of Doctor Moreau',
    author: 'H.G. Wells',
    category: 'Science Fiction',
    difficulty: 'Intermediate',
    tags: ['vivisection', 'beast-folk', 'science-ethics', 'sci-fi', 'classic'],
    description: 'Edward Prendick, a shipwrecked man rescued by a passing boat, is left on the island home of Doctor Moreau, a mad scientist who creates human-like hybrid beings from animals via vivisection.',
    thumbnail: 'https://covers.openlibrary.org/b/id/12721840-L.jpg',
    fileUrl: 'https://www.gutenberg.org/ebooks/159.epub3.images',
    fileType: 'epub',
    averageRating: 4.7,
    totalReviews: 1200,
  },
  {
    title: 'Little Women',
    author: 'Louisa May Alcott',
    category: 'Fiction',
    difficulty: 'Beginner',
    tags: ['march-sisters', 'family', 'coming-of-age', 'classic', 'heartwarming'],
    description: 'Follows the lives of the four March sisters—Meg, Jo, Beth, and Amy—and details their passage from childhood to womanhood during and after the American Civil War.',
    thumbnail: 'https://covers.openlibrary.org/b/id/12720910-L.jpg',
    fileUrl: 'https://www.gutenberg.org/ebooks/514.epub3.images',
    fileType: 'epub',
    averageRating: 4.9,
    totalReviews: 2650,
  },
  {
    title: 'Great Expectations',
    author: 'Charles Dickens',
    category: 'Fiction',
    difficulty: 'Intermediate',
    tags: ['pip', 'miss-havisham', 'estella', 'victorian', 'classic'],
    description: 'Depicts the education and personal development of an orphan nicknamed Pip, tracing his growth, love for Estella, and the mysterious fortune bestowed by an unknown benefactor.',
    thumbnail: 'https://covers.openlibrary.org/b/id/12721140-L.jpg',
    fileUrl: 'https://www.gutenberg.org/ebooks/1400.epub3.images',
    fileType: 'epub',
    averageRating: 4.8,
    totalReviews: 1980,
  },
  {
    title: 'Oliver Twist',
    author: 'Charles Dickens',
    category: 'Fiction',
    difficulty: 'Intermediate',
    tags: ['orphan', 'fagin', 'artful-dodger', 'london', 'dickens'],
    description: 'The story of Oliver Twist, born in a workhouse and sold into apprenticeship. After escaping, Oliver travels to London, where he meets the Artful Dodger and Fagin\'s gang of juvenile pickpockets.',
    thumbnail: 'https://covers.openlibrary.org/b/id/12721180-L.jpg',
    fileUrl: 'https://www.gutenberg.org/ebooks/730.epub3.images',
    fileType: 'epub',
    averageRating: 4.8,
    totalReviews: 1860,
  },
  {
    title: 'Dubliners',
    author: 'James Joyce',
    category: 'Fiction',
    difficulty: 'Advanced',
    tags: ['dublin', 'epiphany', 'irish-literature', 'modernism', 'joyce'],
    description: 'A collection of fifteen short stories by James Joyce presenting a vivid and penetrating depiction of middle-class life in and around Dublin in the early years of the 20th century.',
    thumbnail: 'https://covers.openlibrary.org/b/id/12722140-L.jpg',
    fileUrl: 'https://www.gutenberg.org/ebooks/2814.epub3.images',
    fileType: 'epub',
    averageRating: 4.7,
    totalReviews: 1390,
  },
  {
    title: 'The Yellow Wallpaper',
    author: 'Charlotte Perkins Gilman',
    category: 'Horror',
    difficulty: 'Beginner',
    tags: ['psychological-horror', 'feminism', 'madness', 'classic', 'short-story'],
    description: 'A collection of journal entries by a woman whose physician husband has rented an old mansion for the summer. Confined to an upstairs nursery, she becomes obsessed with the room\'s yellow wallpaper.',
    thumbnail: 'https://covers.openlibrary.org/b/id/12723140-L.jpg',
    fileUrl: 'https://www.gutenberg.org/ebooks/1952.epub3.images',
    fileType: 'epub',
    averageRating: 4.8,
    totalReviews: 1450,
  },
  {
    title: 'Gulliver\'s Travels',
    author: 'Jonathan Swift',
    category: 'Adventure',
    difficulty: 'Intermediate',
    tags: ['satire', 'lilliput', 'giants', 'voyages', 'swift'],
    description: 'A prose satire by the Anglo-Irish writer and clergyman Jonathan Swift, satirising both human nature and the "travellers\' tales" literary subgenre across Lilliput, Brobdingnag, and beyond.',
    thumbnail: 'https://covers.openlibrary.org/b/id/12720980-L.jpg',
    fileUrl: 'https://www.gutenberg.org/ebooks/829.epub3.images',
    fileType: 'epub',
    averageRating: 4.7,
    totalReviews: 1670,
  },
  {
    title: 'The Brothers Karamazov',
    author: 'Fyodor Dostoevsky',
    category: 'Philosophy',
    difficulty: 'Advanced',
    tags: ['faith', 'doubt', 'morality', 'russian-literature', 'dostoevsky'],
    description: 'A passionate philosophical novel set in 19th-century Russia that enters deeply into the ethical debates of God, free will, and morality through the drama of three brothers and their father.',
    thumbnail: 'https://covers.openlibrary.org/b/id/12727190-L.jpg',
    fileUrl: 'https://www.gutenberg.org/ebooks/28054.epub3.images',
    fileType: 'epub',
    averageRating: 5.0,
    totalReviews: 2900,
  },
  {
    title: 'Anna Karenina',
    author: 'Leo Tolstoy',
    category: 'Fiction',
    difficulty: 'Advanced',
    tags: ['russian-literature', 'passion', 'society', 'tolstoy', 'tragedy'],
    description: 'A complex novel in eight parts, with more than a dozen major characters, Anna Karenina is widely considered a pinnacle in realist fiction, exploring passion, society, and redemption.',
    thumbnail: 'https://covers.openlibrary.org/b/id/12726540-L.jpg',
    fileUrl: 'https://www.gutenberg.org/ebooks/1399.epub3.images',
    fileType: 'epub',
    averageRating: 4.9,
    totalReviews: 2450,
  },
  {
    title: 'The Moonstone',
    author: 'Wilkie Collins',
    category: 'Mystery',
    difficulty: 'Intermediate',
    tags: ['detective', 'diamond', 'english-manor', 'mystery', 'classic'],
    description: 'Generally considered the first full-length detective novel in the English language, revolving around the theft of an invaluable yellow diamond from an English country estate.',
    thumbnail: 'https://covers.openlibrary.org/b/id/12721940-L.jpg',
    fileUrl: 'https://www.gutenberg.org/ebooks/155.epub3.images',
    fileType: 'epub',
    averageRating: 4.8,
    totalReviews: 1120,
  },
];

async function fetchDynamicGutendexBooks(pagesToFetch = 3) {
  const dynamicBooks = [];
  const seenTitles = new Set(ICONIC_CURATED_COLLECTION.map((b) => b.title.toLowerCase()));

  for (let page = 1; page <= pagesToFetch; page++) {
    try {
      console.log(`📡 Fetching popularity catalog from Gutendex (Page ${page})...`);
      const res = await fetch(`https://gutendex.com/books/?sort=popular&languages=en&page=${page}`);
      if (!res.ok) {
        console.warn(`⚠️ Gutendex page ${page} returned status ${res.status}`);
        break;
      }
      const data = await res.json();
      const results = data.results || [];

      for (const item of results) {
        const rawTitle = formatTitle(item.title);
        const titleLower = rawTitle.toLowerCase();
        if (seenTitles.has(titleLower)) continue;
        seenTitles.add(titleLower);

        const rawAuthor = item.authors?.[0]?.name || 'Classic Author';
        const author = formatAuthorName(rawAuthor);

        const epubUrl = item.formats?.['application/epub+zip'] || `https://www.gutenberg.org/ebooks/${item.id}.epub3.images`;
        const coverImg = item.formats?.['image/jpeg'] || `https://covers.openlibrary.org/b/id/12720000-L.jpg`;

        const category = detectCategory(rawTitle, item.subjects || []);
        const subjects = (item.subjects || []).map((s) => s.split('--')[0].trim().toLowerCase()).filter(Boolean);
        const tags = Array.from(new Set([category.toLowerCase(), ...subjects])).slice(0, 5);

        const description = buildDescription(rawTitle, author, category, item.subjects);

        dynamicBooks.push({
          title: rawTitle,
          author,
          category,
          difficulty: item.download_count > 10000 ? 'Beginner' : 'Intermediate',
          tags,
          description,
          thumbnail: coverImg,
          coverImage: coverImg,
          fileUrl: epubUrl,
          fileType: 'epub',
          averageRating: +(4.6 + (Math.random() * 0.4)).toFixed(1),
          totalReviews: Math.floor(item.download_count / 10) || 500,
        });
      }
    } catch (err) {
      console.error(`❌ Failed to fetch page ${page}:`, err.message);
    }
  }

  return dynamicBooks;
}

async function seedTopCatalog() {
  try {
    if (!MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined in .env');
    }

    console.log('🔌 Connecting to MongoDB Atlas...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB Atlas successfully.\n');

    // 1. Wipe old dummy / test books
    console.log('🧹 [WIPE] Deleting all existing test/dummy books from database...');
    const deletedBooks = await Book.deleteMany({});
    const deletedProgress = await Progress.deleteMany({});
    console.log(`🗑️ Removed ${deletedBooks.deletedCount} old books and reset progress records.`);

    // 2. Fetch popular dynamic books
    console.log('\n🌐 [INGESTION] Fetching top trending world books...');
    const dynamicBooks = await fetchDynamicGutendexBooks(3);
    console.log(`📦 Fetched ${dynamicBooks.length} dynamic popular titles.`);

    // 3. Combine with curated collection
    const allBooksToInsert = [...ICONIC_CURATED_COLLECTION, ...dynamicBooks];
    console.log(`\n📚 Total Top In-Demand Books to Ingest: ${allBooksToInsert.length}`);

    // 4. Insert each book with auto slug creation
    let insertedCount = 0;
    for (const b of allBooksToInsert) {
      try {
        await Book.create({
          title: b.title,
          author: b.author,
          category: b.category,
          difficulty: b.difficulty || 'Intermediate',
          description: b.description,
          tags: b.tags || [],
          language: 'English',
          fileUrl: b.fileUrl,
          fileType: 'epub',
          thumbnail: b.thumbnail,
          coverImage: b.coverImage || b.thumbnail,
          averageRating: b.averageRating || 4.8,
          totalReviews: b.totalReviews || 800,
          parseStatus: 'completed',
          totalChapters: 12,
        });
        insertedCount++;
        process.stdout.write(`✅ [${insertedCount}/${allBooksToInsert.length}] Ingested: "${b.title}" by ${b.author}\n`);
      } catch (insertErr) {
        console.error(`⚠️ Failed to insert "${b.title}":`, insertErr.message);
      }
    }

    console.log(`\n🎉 SUCCESS! Ingested ${insertedCount} Top World Masterpieces into Readify Catalog!`);
  } catch (error) {
    console.error('❌ Fatal error during seeder:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB.');
  }
}

seedTopCatalog();
