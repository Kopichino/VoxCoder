print('hello')

def fibonacci(n):
    if n <= 0:
        return "Input should be a positive integer."
    elif n == 1:
        return 0
    elif n == 2:
        return 1
    else:
        a, b = 0, 1
        for _ in range(n - 2):
            a, b = b, a + b
        return b

def find_primes(n):
    primes = []
    for possiblePrime in range(2, n + 1):
        isPrime = True
        for num in range(2, int(possiblePrime ** 0.5) + 1):
            if possiblePrime % num == 0:
                isPrime = False
                break
        if isPrime:
            primes.append(possiblePrime)
    return primes

def find_even_numbers(n):
    even_numbers = []
    for num in range(2, n + 1):
        if num % 2 == 0:
            even_numbers.append(num)
    return even_numbers

def find_odd_numbers(n):
    odd_numbers = []
    for num in range(2, n + 1):
        if num % 2 != 0:
            odd_numbers.append(num)
    return odd_numbers

print(fibonacci(10))
print(find_primes(30))
print(find_even_numbers(20))
print(find_odd_numbers(20))
print('Hello')