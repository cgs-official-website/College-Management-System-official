import React, { useState } from 'react';
import { Plus, Search, Book, Edit, Trash2, Library as LibIcon, BookOpen } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { useLibrary } from '../../../hooks/useLibrary';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { BookFormModal } from './BookFormModal';
import { useConfirm } from '../../../contexts/ConfirmContext';

export default function Library() {
  const confirm = useConfirm();
  const { userData } = useAuth();
  const collegeId = userData?.collegeId || 'default_college_id';
  const { books, isLoading, addBook, updateBook, deleteBook, isAdding, isUpdating } = useLibrary(collegeId);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBook, setEditingBook] = useState(null);

  const filteredBooks = books.filter(book => 
    book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    book.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
    book.isbn?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenAdd = () => {
    setEditingBook(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (book) => {
    setEditingBook(book);
    setIsFormOpen(true);
  };

  const handleDelete = async (id) => {
    if (await confirm({ message: "Are you sure you want to remove this book from the library?" })) {
      await deleteBook(id);
    }
  };

  const handleSubmit = async (data) => {
    try {
      if (editingBook) {
        await updateBook({ id: editingBook.id, data });
      } else {
        await addBook(data);
      }
      setIsFormOpen(false);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Library Management</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage physical book inventory and track borrowing.</p>
        </div>
        <Button onClick={handleOpenAdd}>
          <Plus className="w-4 h-4 mr-2" />
          Add New Book
        </Button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between bg-white dark:bg-[#0A0F1C] p-4 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <Input 
            placeholder="Search by title, author, or ISBN..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 mb-0"
          />
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <th className="p-4 pl-6">Book Title & Author</th>
                <th className="p-4">Category</th>
                <th className="p-4">ISBN</th>
                <th className="p-4 text-center">Available</th>
                <th className="p-4 pr-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {isLoading ? (
                [1, 2, 3, 4].map(n => (
                  <tr key={n} className="animate-pulse">
                    <td className="p-4 pl-6"><div className="h-10 w-48 bg-slate-100 dark:bg-white/5 rounded-lg"></div></td>
                    <td className="p-4"><div className="h-6 w-24 bg-slate-100 dark:bg-white/5 rounded-lg"></div></td>
                    <td className="p-4"><div className="h-6 w-32 bg-slate-100 dark:bg-white/5 rounded-lg"></div></td>
                    <td className="p-4"><div className="h-6 w-16 bg-slate-100 dark:bg-white/5 rounded-lg mx-auto"></div></td>
                    <td className="p-4 pr-6"></td>
                  </tr>
                ))
              ) : filteredBooks.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-12 text-center">
                    <div className="w-16 h-16 bg-slate-50 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                      <LibIcon className="w-8 h-8 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">No books found</h3>
                    <p className="text-slate-500 dark:text-slate-400">Add some books to your library inventory.</p>
                  </td>
                </tr>
              ) : (
                filteredBooks.map((book) => (
                  <tr key={book.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors group">
                    <td className="p-4 pl-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary-50 dark:bg-primary-500/10 flex items-center justify-center text-primary-500 border border-primary-100 dark:border-primary-500/20">
                          <Book className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white text-sm line-clamp-1">{book.title}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">by {book.author}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="px-2.5 py-1 bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-400 rounded-md text-xs font-bold uppercase tracking-wider w-max">
                        {book.category}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-slate-600 dark:text-slate-400">
                      {book.isbn || 'N/A'}
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <span className={`font-extrabold text-lg ${book.availableCopies > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                          {book.availableCopies}
                        </span>
                        <span className="text-xs text-slate-500">/ {book.totalCopies}</span>
                      </div>
                    </td>
                    <td className="p-4 pr-6 text-right">
                      <div className="flex items-center justify-end gap-2 transition-opacity">
                        <button onClick={() => handleOpenEdit(book)} className="p-2 text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-lg shadow-sm">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(book.id)} className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-lg shadow-sm">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <BookFormModal 
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleSubmit}
        initialData={editingBook}
        isLoading={isAdding || isUpdating}
      />
    </div>
  );
}
