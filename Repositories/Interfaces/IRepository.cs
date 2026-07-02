using Microsoft.EntityFrameworkCore;

namespace WebTestPortal.Repositories.Interfaces;

public interface IRepository<T> where T : class
{
    Task<IQueryable<T>> QueryAsync();
    Task<T?> GetByIdAsync(int id);
    Task<T> AddAsync(T entity);
    Task UpdateAsync(T entity);
    Task DeleteAsync(T entity);
    Task<bool> ExistsAsync(int id);
    Task<int> SaveChangesAsync();
}
