let stopwords = [
  "a", "able", "about", "across", "after", "all", "almost",
  "also", "am", "among", "an", "and", "any", "are", "as",
  "at", "be", "because", "been", "but", "by", "can", "cannot",
  "could", "dear", "did", "do", "does", "either", "else",
  "ever", "every", "for", "from", "get", "got", "had", "has",
  "have", "he", "her", "hers", "him", "his", "how", "however",
  "i", "if", "in", "into", "is", "it", "its", "just", "least",
  "let", "like", "likely", "may", "me", "might", "most", "must",
  "my", "neither", "no", "nor", "not", "of", "off", "often",
  "on", "only", "or", "other", "our", "own", "rather", "said",
  "say", "says", "she", "should", "since", "so", "some", "than",
  "that", "the", "their", "them", "then", "there", "these",
  "they", "this", "tis", "to", "too", "twas", "us", "wants",
  "was", "we", "were", "what", "when", "where", "which", "while",
  "who", "whom", "why", "will", "with", "would", "yet", "you",
  "your", "ain't", "aren't", "can't", "could've", "couldn't",
  "didn't", "doesn't", "don't", "hasn't", "he'd", "he'll",
  "he's", "how'd", "how'll", "how's", "i'd", "i'll", "i'm",
  "i've", "isn't", "it's", "might've", "mightn't", "must've",
  "mustn't", "shan't", "she'd", "she'll", "she's", "should've",
  "shouldn't", "that'll", "that's", "there's", "they'd", "they'll",
  "they're", "they've", "wasn't", "we'd", "we'll", "we're",
  "weren't", "what'd", "what's", "when'd", "when'll", "when's",
  "where'd", "where'll", "where's", "who'd", "who'll", "who's",
  "why'd", "why'll", "why's", "won't", "would've", "wouldn't",
  "you'd", "you'll", "you're", "you've"
];

// removes stopwords from a phrase
function removeStopWords(phrase) {
  let common = stopwords;
  //var wordArr = phrase.match(/\w+/g),
  let wordArr = phrase.split(/(?=\w)\b|\W/),
    commonObj = {},
    uncommonArr = [],
    word, i;

  for (i = 0; i < common.length; i++) {
    commonObj[common[i].trim()] = true;
  }

  for (i = 0; i < wordArr.length; i++) {
    word = wordArr[i].trim().toLowerCase();
    if (!commonObj[word]) {
      uncommonArr.push(word);
    }
  }
  return uncommonArr;
}

module.exports = {
  "remove": removeStopWords
};
