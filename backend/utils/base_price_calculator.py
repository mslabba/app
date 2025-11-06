"""
Base Price Calculator Utility

Handles calculations for minimum base price requirements for teams
based on category requirements and current squad composition.
"""

def calculate_base_price_requirements(categories, current_players_by_category=None):
    """
    Calculate the total base price requirements for a team.
    
    Args:
        categories: List of category objects with base_price and min_players
        current_players_by_category: Dict of {category_id: player_count} for owned players
    
    Returns:
        Dict with base price calculation details
    """
    if current_players_by_category is None:
        current_players_by_category = {}
    
    total_required_base_price = 0
    remaining_obligations = {}
    total_squad_size = 0
    
    for category in categories:
        category_id = category.id
        current_count = current_players_by_category.get(category_id, 0)
        remaining_needed = max(0, category.min_players - current_count)
        
        category_base_price = category.base_price
        remaining_obligation = remaining_needed * category_base_price
        
        remaining_obligations[category_id] = {
            'category_name': category.name,
            'base_price': category_base_price,
            'min_required': category.min_players,
            'current_count': current_count,
            'remaining_needed': remaining_needed,
            'remaining_obligation': remaining_obligation
        }
        
        total_required_base_price += remaining_obligation
        total_squad_size += category.min_players
    
    return {
        'total_base_price_obligation': total_required_base_price,
        'category_obligations': remaining_obligations,
        'total_minimum_squad_size': total_squad_size
    }


def calculate_effective_budget(team_budget, team_spent, base_price_obligations):
    """
    Calculate the effective budget available for bidding after accounting for base price obligations.
    
    Args:
        team_budget: Total team budget
        team_spent: Amount already spent
        base_price_obligations: Total base price obligations remaining
    
    Returns:
        Dict with budget calculation details
    """
    remaining_budget = team_budget - team_spent
    effective_budget = remaining_budget - base_price_obligations
    
    return {
        'total_budget': team_budget,
        'spent': team_spent,
        'remaining_budget': remaining_budget,
        'base_price_obligations': base_price_obligations,
        'effective_budget': max(0, effective_budget),  # Cannot be negative
        'can_bid': effective_budget > 0
    }


def validate_bid_against_obligations(bid_amount, team_budget_info):
    """
    Validate if a team can place a bid considering their base price obligations.
    
    Args:
        bid_amount: The amount team wants to bid
        team_budget_info: Output from calculate_effective_budget()
    
    Returns:
        Dict with validation result
    """
    if not team_budget_info['can_bid']:
        return {
            'valid': False,
            'reason': 'Team has insufficient funds to meet base price obligations',
            'shortfall': team_budget_info['base_price_obligations'] - team_budget_info['remaining_budget']
        }
    
    if bid_amount > team_budget_info['effective_budget']:
        return {
            'valid': False,
            'reason': f'Bid exceeds effective budget. Maximum bid: ₹{team_budget_info["effective_budget"]:,}',
            'max_bid': team_budget_info['effective_budget']
        }
    
    return {
        'valid': True,
        'remaining_after_bid': team_budget_info['effective_budget'] - bid_amount
    }


def get_category_player_count(players, categories):
    """
    Count players by category for a team.
    
    Args:
        players: List of player objects or dicts
        categories: List of category objects
    
    Returns:
        Dict of {category_id: count}
    """
    player_count_by_category = {}
    
    for category in categories:
        player_count_by_category[category.id] = 0
    
    for player in players:
        # Handle both dict and object formats
        if isinstance(player, dict):
            category_id = player.get('category_id')
        else:
            category_id = getattr(player, 'category_id', None)
            
        if category_id and category_id in player_count_by_category:
            player_count_by_category[category_id] += 1
    
    return player_count_by_category