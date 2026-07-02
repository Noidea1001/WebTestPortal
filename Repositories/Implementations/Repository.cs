using Microsoft.EntityFrameworkCore;
using WebTestPortal.Data;
using WebTestPortal.Repositories.Interfaces;

namespace WebTestPortal.Repositories.Implementations;

public class Repository<T> : IRepository<T> where T : class
{
    protected readonly AppDbContext _db;

    public Repository(AppDbContext db)
    {
        _db = db;
    }

    public virtual async Task<IQueryable<T>> QueryAsync()
    {
        return await Task.FromResult(_db.Set<T>().AsQueryable());
    }

    public virtual async Task<T?> GetByIdAsync(int id)
    {
        return await _db.Set<T>().FindAsync(id);
    }

    public virtual async Task<T> AddAsync(T entity)
    {
        await _db.Set<T>().AddAsync(entity);
        return entity;
    }

    public virtual Task UpdateAsync(T entity)
    {
        _db.Set<T>().Update(entity);
        return Task.CompletedTask;
    }

    public virtual Task DeleteAsync(T entity)
    {
        _db.Set<T>().Remove(entity);
        return Task.CompletedTask;
    }

    public virtual async Task<bool> ExistsAsync(int id)
    {
        var entity = await GetByIdAsync(id);
        return entity != null;
    }

    public virtual async Task<int> SaveChangesAsync()
    {
        return await _db.SaveChangesAsync();
    }
}
