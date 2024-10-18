const bookList = document.getElementById('book-list');
const bookForm = document.getElementById('book-form');
const searchInput = document.getElementById('search');
const genreFilter = document.getElementById('genre-filter');
const borrowerHistorySection = document.getElementById('borrower-history');

async function fetchBooks() {
    const response = await fetch('http://localhost:3000/books');
    return response.json();
}

function formatDate(dateString) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}

async function displayBooks() {
    const books = await fetchBooks();
    const filteredBooks = filterBooks(books);
    bookList.innerHTML = '';

    filteredBooks.forEach(book => {
        const li = document.createElement('li');
        li.innerText = `${book.title} by ${book.author} (${book.genre})`;
        
        if (book.borrowed) {
            li.innerText += ` - Borrowed by: ${book.borrowerName} on ${formatDate(book.borrowDate)}`;
            li.appendChild(createReturnButton(book.id));
        } else {
            li.appendChild(createBorrowButton(book.id));
        }

        li.appendChild(createDeleteButton(book.id));
        bookList.appendChild(li);
    });
}

function createDeleteButton(id) {
    const button = document.createElement('button');
    button.innerText = 'Delete';
    button.onclick = async () => {
        await deleteBook(id);
        displayBooks();
    };
    return button;
}

function createBorrowButton(id) {
    const button = document.createElement('button');
    button.innerText = 'Borrow';
    button.onclick = async () => {
        const borrowerName = prompt("Enter your name:");
        if (borrowerName) {
            await borrowBook(id, borrowerName);
            displayBooks();
            updateBorrowerHistory(borrowerName);
        }
    };
    return button;
}

function createReturnButton(id) {
    const button = document.createElement('button');
    button.innerText = 'Return';
    button.onclick = async () => {
        await returnBook(id);
        displayBooks();
    };
    return button;
}

async function borrowBook(id, borrowerName) {
    const bookResponse = await fetch(`http://localhost:3000/books/${id}`);
    const bookData = await bookResponse.json();
    
    bookData.borrowed = true;
    bookData.borrowerName = borrowerName;
    bookData.borrowDate = new Date().toISOString(); 
    bookData.borrowCount = (bookData.borrowCount || 0) + 1;
    
    await fetch(`http://localhost:3000/books/${id}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookData),
    });

    displayStatistics();
}

async function displayStatistics() {
    const books = await fetchBooks();
    const totalBorrowings = books.reduce((sum, book) => sum + (book.borrowed ? 1 : 0), 0);
    
    const popularBooks = books.sort((a, b) => b.borrowCount - a.borrowCount).slice(0, 5);

    const statsSection = document.getElementById('statistics');
    statsSection.innerHTML = `<h2>Library Statistics</h2>`;
    statsSection.innerHTML += `<p>Total Borrowings: ${totalBorrowings}</p>`;
    statsSection.innerHTML += `<h3>Most Popular Books:</h3><ul>`;
    
    popularBooks.forEach(book => {
        statsSection.innerHTML += `<li>${book.title} by ${book.author} (Borrowed ${book.borrowCount} times)</li>`;
    });
    
    statsSection.innerHTML += `</ul>`;
}

async function returnBook(id) {
    const book = await fetch(`http://localhost:3000/books/${id}`);
    const bookData = await book.json();

    bookData.borrowed = false;
    bookData.borrowerName = null;
    bookData.borrowDate = null; 

    await fetch(`http://localhost:3000/books/${id}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookData),
    });
}

async function deleteBook(id) {
    await fetch(`http://localhost:3000/books/${id}`, {
        method: 'DELETE',
    });
}

function updateBorrowerHistory(borrowerName) {
    const historyItem = document.createElement('li');
    historyItem.innerText = `${borrowerName} borrowed a book on ${formatDate(new Date().toISOString())}`;
    borrowerHistorySection.appendChild(historyItem);
}

bookForm.addEventListener('submit', async (e) => {
    e.preventDefault(); 
    const newBook = {
        title: document.getElementById('title').value,
        author: document.getElementById('author').value,
        genre: document.getElementById('genre').value,
        borrowed: false,
        borrowerName: null,
        borrowDate: null,
        borrowCount: 0,
    };
    await fetch('http://localhost:3000/books', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(newBook),
    });
    bookForm.reset();
    displayBooks();
    displayStatistics();
});

searchInput.addEventListener('input', displayBooks);
genreFilter.addEventListener('change', displayBooks);

function filterBooks(books) {
    const searchTerm = searchInput.value.toLowerCase();
    const selectedGenre = genreFilter.value;

    return books.filter(book => {
        const matchesSearch = book.title.toLowerCase().includes(searchTerm);
        const matchesGenre = selectedGenre ? book.genre === selectedGenre : true;
        return matchesSearch && matchesGenre;
    });
}

displayBooks();
displayStatistics();
