# Start coding here...

def find_prime_numbers(n):
    """
    This function finds all prime numbers up to n.

    Args:
        n (int): The upper limit for finding prime numbers.

    Returns:
        list: A list of prime numbers up to n.
    """
    prime_numbers = []
    for possiblePrime in range(2, n + 1):
        # Assume number is prime until shown it is not.
        isPrime = True
        for num in range(2, int(possiblePrime ** 0.5) + 1):
            if possiblePrime % num == 0:
                isPrime = False
                break
        if isPrime:
            prime_numbers.append(possiblePrime)
    return prime_numbers

# Example usage:
print(find_prime_numbers(30))  # Output: [2, 3, 5, 7, 11, 13, 17, 19, 23, 29]